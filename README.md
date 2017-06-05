# DECtalk Online
### talk.moustacheminer.com

DECtalk Online is an online repository and online web server for the DECtalk text to speech synthesis, made popular by Stephen Hawking and prominent in other popular media.

## I want my own!

Normally, I would have an instruction manual on how to run this on Linux. However, due to the use of Windows programs, I built the program to run on Microshaft Windows only.

### For this art project, you will need:

1. A Windows 7 Machine (Can be Virtual)
2. Client ID and secret for OAUTH in GitHub, Discord and Reddit
3. A Discord Webhook
4. node.js (and npm)
5. A copy of `say.exe`. You can get one from Snoopi Botten's site: http://theflameofhope.co/
6. A `rethonk` database.

### Let's get painting!

1. Rename `rename.default.js` to `default.js` and put your info in. The callback URL is there just in case your server is behind a reverse proxy.
	- To add yourself as an admin, you put the permanent username followed by how you logged in. For example, you can have `lepon01@github` or `lepon01@reddit`, but not `7coil#3175@discord`, because the username is not permanent. For Discord, use the user ID
2. In the RethonkDB web interface, create:
	- A database called `dectalk`
	- Tables inside it called `csrf`, `list`, `queue` and `users`
3. Run the program, by running `npm start`

After you have finished, you can access the queue at `/queue`.

## Thanks

### Passport in RethonkDB (MIT)
_there wasn't a licence with the project, but it was inside `package.json` so..._  
https://github.com/thejsj/passport-rethinkdb-tutorial

MIT License

Copyright (c) 2015 thejsj

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.