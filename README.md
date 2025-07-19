The idea here is simple: just have fun building a web server using only Node.js’s standard library — nothing more, nothing less. We’re solving most of the challenge’s problems within a 1:1 scope, sticking to the core requirements.

Before anyone says “this is insane” or whatever — relax. This is actually quite normal. People have been writing code like this for decades. Modern programming concepts are welcome, of course, but let’s not treat them like the holy grail of IT. Be respectful, and I will be too 🙂

### Notes
- The project has 2 web instance, but managed by the node it self (check node documentation)
- Since JavaScript handles HTTP requests asynchronously and in parallel by default, we can just take advantage of that behavior. A simple "Promise.all" does the job.
- Javascript is a toy language and does not have aany compromisse with peformance other than be funny (but it is showing really iinstreating peformances benchs)

