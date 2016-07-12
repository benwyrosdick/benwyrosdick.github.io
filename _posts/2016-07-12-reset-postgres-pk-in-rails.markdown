---
layout: post
title: "Reset Postgres PK Sequences in Rails"
date: 2016-07-12T15:32:53-05:00
categories: til
tags: ruby,postgres
---

When doing multiple imports and deletions of development data I got into a state where I couldn't insert into `ActiveRecord` because the `id` was already taken.

To fix that I used the following code to reset the `pk_sequence` on all of my tables.

{% highlight ruby %}
ActiveRecord::Base.connection.tables.each do |t|
  ActiveRecord::Base.connection.reset_pk_sequence!(t)
end
{% endhighlight %}
