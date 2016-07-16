---
title: Adding Swap to a Linux Sytem
date: 2016-07-16T15:24:54-05:00
category: TIL
tags: [linux]
---

I find myself needing to do this all the time and have to go search for a good artcile to remember all the commands. I often go back to [this](https://www.digitalocean.com/community/tutorials/how-to-add-swap-on-ubuntu-14-04) article to help me remember how to do it. For the sake of brevity I am just writing down the commands needed. Please read over the full article to understand what you are doing.

```
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

Now that we have enabled swap we need to make sure it persist when we reboot. To do this edit the `/etc/fstab` file and add the following line:

```
/swapfile   none    swap    sw    0   0
```
