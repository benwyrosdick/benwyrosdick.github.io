# benwyrosdick.github.io

Octopress Docs: https://github.com/octopress/octopress

## Octopress CLI Commands

Here are the subcommands for Octopress.

```
init <PATH>         # Adds Octopress scaffolding to your site
new <PATH>          # Like `jekyll new` + `octopress init`
new post <TITLE>    # Add a new post to your site
new page <PATH>     # Add a new page to your site
new draft <TITLE>   # Add a new draft post to your site
publish <POST>      # Publish a draft from _drafts to _posts
unpublish <POST>    # Search for a post and convert it into a draft
isolate [POST]      # Stash all posts but the one you're working on for a faster build
integrate           # Restores all posts, doing the opposite of the isolate command
deploy              # deploy your site via S3, Rsync, or to GitHub pages.
```

Run `octopress --help` to list sub commands and `octopress <subcommand> --help` to learn more about any subcommand and see its options.

## Building Site

Site is auto-built on each git push to Github. You can build locally with `jekyll build` but the `_site` folder is ignored by git.
