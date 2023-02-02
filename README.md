# Serverless-ActivityPub

***(aka Serverless Mastodon aka Matsodonless aka Lesstodon)***

This is a CDK-based Serverless Implementation of ActivityPub that is (or will be) compatible with Mastodon.

**You should absolutely not use this *(for now)***... it's a POC and most APIs are not implemented (yet).

## TODO:

- [ ] ***[ACTIVE FOCUS]*** Follow users on another server
- [ ] Send "Toots" to followers
- [ ] Unit tests 😅
- [ ] Arch diagram(s)
- [ ] List out APIs to convert in TODO List... (https://docs.joinmastodon.org/dev/routes/)

## Completed:
- [x] Convert from single-user to multi-user
- [x] Single User webfinger
- [x] Follow single user from mastodon
- [x] Unfollow single user from mastodon
- [x] Webfinger endpoint (endpoint used by external mastodons for user search)
- [x] Mastodon request verifying / signing
- [x] Basic react app with cognito

## Streams

- Serverless Cult 2023-01-08: Overview and single-to-multi conversion

## Related Content

- https://social.juanlu.space/@astrojuanlu/109494509943358395
- https://indieweb.social/@brianleroux/109451753505573357
- https://github.com/brooksn/serverless-activitypub
- https://aeracode.org/2022/11/14/takahe-new-server/

## Contributing

Contributing is welcome!  Feel free to grab something from the TODO list, improve documentation or suggest other things that are needed for the project.  If you end up contributing and would like to talk about your contribution on-stream we could also set that up!