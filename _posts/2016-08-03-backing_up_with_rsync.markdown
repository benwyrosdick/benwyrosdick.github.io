---
layout: post
title: Backing Up With Rsync
date: 2016-08-03T12:47:41-05:00
category: 
tags: [backup,linux]
---

There is no shortage of backup tools available that take care of backing up your data and storing it securely online or in an offsite location. I use [backblaze](https://secure.backblaze.com/r/00gjwd) for my personal computers. Even with that I think it is important, and sometimes useful, to understand how that mechanism works and be able to setup your own backup strategy with the tools built-in to the linux (and mac os) platform.

We will take a look at setting up incremental backups. This means that we will take a full backup first then we will be taking just the differences after that. We will use Rsync to accomplish this, but before we get to that lets look at the mechanisms that make this possible.

Hard Links
==========

You probably think of a file on your filesystem as containing the actual data. In fact all the "files" on your filesystem are hard links to the file on disk such that you can have the same file with multiple links in the filesystem to the same logical file on disk.

You see this often, even if you never realized it, with directories. when you do an `ls` in a directory you will always see two records `.` and `..` even if a directory is empty. These are hard links to the current directy and to the parent directory.

{% highlight shell %}
$ ls -al
total 0
drwxr-xr-x    2 ben  staff    68 Aug  3 16:46 .
drwxr-xr-x+ 147 ben  staff  4998 Aug  3 16:47 ..
{% endhighlight %}

You can also create these links yourself using the `ln` command. You have probably used it to create symbolic links with `ln -s`. These symbolic links act a differently from hard links in that they link to a file on the filesystem not a file on disk. This means that if the link on the filesystem it points to changes so does that symbolic link. It also means that if the file it points to is deleted it no longer points to a file. This is different from a hard link in that if you create a hard links to a file on disk and remove the file you "pointed" the link to it still exists just like a normal file. In fact it is a normal file it just doesn't take up extra space for new links.

What implications does this have on deleting files? You might have guessed that when you delete a file with the `rm` command you are not actually deleting the file but just the link to the file on disk. In fact `rm` is an alias to the `unlink` command in unix. A file is removed from disk when the number of links drops to 0. You can see how many links a file has to it with the `stat` command.

Let's create an example to see this in action.

{% highlight shell %}
$ echo TEST > file_a
{% endhighlight %}

Now we have a file on disk and link to it named `file_a`. Let's create a second link to that file.

{% highlight shell %}
$ ln file_a file_b
{% endhighlight %}

Now let's use the `stat` command to see some info about the files. We will see how many links a file has to it as well as the [inode](https://en.wikipedia.org/wiki/Inode) number which represents where the file is stored on disk.

{% highlight shell %}
$ stat file_a
16777220 85669598 -rw-r--r-- 2 ben staff 0 5 "Aug  3 17:03:53 2016" "Aug  3 17:03:53 2016" "Aug  3 17:05:23 2016" "Aug  3 17:03:53 2016" 4096 8 0 file_a
{% endhighlight %}

Some important columns to look at are the 2nd (inode) and 4th (number of links). If we create a third link and rerun the `stat` command we will see the number of links change.

{% highlight shell %}
$ ln file_a file_c
$ stat file_a
16777220 85669598 -rw-r--r-- 3 ben staff 0 5 "Aug  3 17:03:53 2016" "Aug  3 17:03:53 2016" "Aug  3 17:10:57 2016" "Aug  3 17:03:53 2016" 4096 8 0 file_a
{% endhighlight %}

We can also use the `ls` command with the `-i` option to show the inode information.

{% highlight shell %}
$ ls -il
total 24
85669598 -rw-r--r--  3 ben  staff  5 Aug  3 17:03 file_a
85669598 -rw-r--r--  3 ben  staff  5 Aug  3 17:03 file_b
85669598 -rw-r--r--  3 ben  staff  5 Aug  3 17:03 file_c
{% endhighlight %}

To demonstrate that these links all point to the same file we will view the contents of `file_a` before and after writing new text to `file_c`

{% highlight shell %}
$ cat file_a
TEST

$ echo NEW_TEST >> file_c

$ cat file_a
TEST
NEW_TEST
{% endhighlight %}

So we see that any changes to a file get made to all the files since they all point to the same file on disk, and deleting a file doesn't delete the file on disk until all the links are deleted. If we want to make a change to a file without changing all the files that point to it we need to unlink it first and write to that location. This will be important later when we use these links to store incremental backups.

Mechanics of incremental backup
===============================

I will show how to use rsync in just a moment to accomplish the backups, but before we do lets look at how it works.

Our first backup, which will be our full backup, will be stored in a folder named with a timestamp. Each backup after that will also be stored in a folder with a timestamp of when the backup was run. After each run we will symlink a folder called `latest` to the most recent run.

After the initial backup we want to make the new backup folder a tree of hard links to the previous backup and only unlink and change files that have changed. Rsync will handle this for us but to get an idea of how to accomplish that manually we can use `cp -al` to make a copy of the backup folder with links. The `-l` option makes hard links instead of copying the files. It doesn't make links of folders though. The `-a` option tells `cp` to take an archive which recurses through the tree and preserves file ownership and permissions.

This means that when the backup runs in our newly linked folder we are only storing the differences in the new state and the previous state since using the links didn't take up any additional space on the disk for the new folder. We are only adding files that are new or have changed.

Using Rsync to accomplish the backup
====================================

Lets create our inital backup

{% highlight shell %}
$ rsync -av demo/ bak/`date +%F_%T`/
building file list ... done
created directory bak/2016-08-03_22:37:36
./
file_a
file_b

sent 208 bytes  received 70 bytes  556.00 bytes/sec
total size is 8  speedup is 0.03
{% endhighlight %}

Two things to point out about that `rsync` command. The first is that slashes are very important here. If you leave off the slash from the source folder for instance it will copy the source folder as the root instead of the files inside of it. The second thing to note is the interpolated date in the command. When the command was executed `date +%F_%T` got translated as `2016-08-03_22:37:36`.

Now that we have a backup in place lets create our symlink to the latest copy.

{% highlight shell %}
$ ln -sfn `ls -r bak | egrep '\d' | head -n 1` bak/latest
{% endhighlight %}

The previous command uses and interpolated command `ls -r bak | egrep '\d' | head -n 1` to find the last timestamped backup by doing an `ls` on the folder and sorting them in reverse order with `-r` then using `grep` to only find the folders with digits to match the timestamped folders then returning the first line using `head -n 1`. We use that folder found as the destination in the symlink. The options we use here are important too. The `-s` creates a symbolic link and not a hard link to the folder. The `-fn` option combination forces `ln` to overwrite a previous link if it exists.

Now our folder looks like this

{% highlight shell %}
$ ls -l bak
total 8
drwxr-xr-x  4 ben  staff  136 Aug  3 22:37 2016-08-03_22:37:36
lrwxr-xr-x  1 ben  staff   19 Aug  3 22:41 latest -> 2016-08-03_22:37:36
{% endhighlight %}

Now that we have a full backup in place lets create our first incremental backup. Rsync has some options that handle doing the archive linked copy and then doing the backup.

I will add a new file `file_c` before running the backup and we will see that only that file is recognized as changed when the backup runs.

{% highlight shell %}
$ rsync -av --delete --link-dest=../`ls -r bak | egrep '\d' | head -n 1` demo/ bak/`date +%F_%T`/
building file list ... done
created directory bak/2016-08-03_22:52:38
./
file_c

sent 170 bytes  received 48 bytes  436.00 bytes/sec
total size is 12  speedup is 0.06
{% endhighlight %}

We notice two new options this time. The `--delete` option tells rsync to remove anything in the destination folder that does not exist in the source. We also see the `--link-dest` option that tells rsync to make a linked copy of that folder to write into. And once again we are making use of the interpolation to find the latest backup and timestamp the current backup.

Now we will update the symlink and examine the directory contents once more

{% highlight shell %}
$ ln -sfn `ls -r bak | egrep '\d' | head -n 1` bak/latest
$ ls -l bak
total 8
drwxr-xr-x  4 ben  staff  136 Aug  3 22:37 2016-08-03_22:37:36
drwxr-xr-x  5 ben  staff  170 Aug  3 22:50 2016-08-03_22:52:38
lrwxr-xr-x  1 ben  staff   19 Aug  3 22:54 latest -> 2016-08-03_22:52:38
{% endhighlight %}

All that is left now is to put our script into a cron job so it run at regular intervals. When we put the commands in cron it probably makes sense to drop the `-v` flag from rsync so the output isn't so noisy. We will make an executable to run the snapshot and create our new symlink at `/usr/local/bin/run_backup.sh`.

{% highlight bash %}
#!/bin/bash
# ----------------------------------------------------------------------
# Take an incremental snapshot using rsync
# ----------------------------------------------------------------------

# ------------- system commands used by this script --------------------
LN=/bin/ln;
RSYNC=/usr/bin/rsync;

# ------------- file locations -----------------------------------------
SOURCE=/Users/ben/demo;
DEST_ROOT=/Users/ben/bak;

# ------------- backup logic -------------------------------------------

# run the backup
$RSYNC -a --delete --link-dest=../`ls -r $DEST_ROOT | egrep '\d' | head -n 1` $SOURCE/ $DEST_ROOT/`date +%F_%T`/

# symlink to latest
$LN -sfn `ls -r $DEST_ROOT | egrep '\d' | head -n 1` $DEST_ROOT/latest
{% endhighlight %}

Be sure to make the file you just created executable

{% highlight shell %}
$ chmod +x /usr/local/bin/run_backup.sh
{% endhighlight %}

Now you can add it to crontab with `crontab -e`. I will set it to run every day at midnight.

{% highlight crontab %}
# MIN HOUR DOM MON DOW CMD
0 0 * * * /usr/local/bin/run_backup.sh >/dev/null 2>&1
{% endhighlight %}

Enhancements
============

This is just an example of how to setup the backups. In a real world scenario you would not run the backups to your local disk. You can easily backup to an attached or network drive as well as tell rsync to write to a remote server with `user@host:/path` syntax.

{% highlight shell %}
$ rsync -av demo/ ben@backup.benwyrosdick.com:~/bak/`date +%F_%T`/
building file list ... done
created directory /home/ben/bak/2016-08-03_23:45:43
./
file_a
file_b
file_c

sent 270 bytes  received 92 bytes  241.33 bytes/sec
total size is 12  speedup is 0.03
{% endhighlight %}
