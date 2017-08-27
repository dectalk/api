# DECtalk Online
### talk.moustacheminer.com

DECtalk Online is an online repository and online web server for the DECtalk text to speech synthesis, made popular by Stephen Hawking and prominent in other popular media.

## I want my own!

Normally, I would have an instruction manual on how to run this on Linux. However, due to the use of Windows programs, I built the program to run on Microshaft Windows only.

### For this art project, you will need:

1. A Windows 7 Machine (Can be Virtual)
2. node.js (and npm)
3. A copy of `say.exe`. You can get one from Snoopi Botten's site: http://theflameofhope.co/
4. A `RethonkDB` database.

### Let's get painting!

1. Rename `rename.default.json` to `default.json` and put your RethonkDB DB location in
2. In the RethonkDB web interface, create:
	- A database called `dectalk`
	- Tables inside it called `list`
3. Run the program, by running `npm start`

After you have finished, you can access the queue at `/queue`.
