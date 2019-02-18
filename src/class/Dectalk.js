const { spawn, exec } = require('child_process');
const tmp = require('tmp');
const { Readable } = require('stream');
const config = require('../config.json');

module.exports = class Dectalk {
  constructor({
    text = '',
  }) {
    this.timeout = null;
    this.outFile = tmp.fileSync();

    // Create a stream with the user's input
    this.textStream = new Readable();
    this.textStream.push('[:phoneme on]');
    this.textStream.push(text);
    this.textStream.push(null);
  }

  execute() {
    return new Promise((resolve, reject) => {
      let executable = null;

      if (process.platform === 'win32') {
        // Just execute the program
        executable = spawn(config[process.platform].executable, [
          '-w', this.outFile.name
        ], {
          detached: true
        });
      } else if (process.platform === 'linux') {
        // Use wine to run this program
        executable = exec(`DISPLAY=:0.0 wine ${config[process.platform].executable} -w ${this.outFile.name}`);
      }

      // Pipe the user's input into the process
      this.textStream.pipe(executable.stdin);

      // Have a timeout timer
      this.timeout = setTimeout(() => {
        reject('Timed out');
        this.cleanup();
        executable.kill();
      }, 10000);

      // When the process finishes, clear the timer
      executable.on('close', (code) => {
        this.cleanup();
        if (code === 0) {
          // Then resolve if exited correctly
          resolve(this.outFile.name);
        } else {
          reject(`The executable exited with error code ${code}`);
        }
      });

      executable.on('error', (err) => {
        this.cleanup();
        reject(`Failed to execute command. ${err.message}`);
      });
    });
  }

  // General cleanup script. Does not delete file.
  cleanup() {
    clearTimeout(this.timeout);
  }

  // Call when finished using file
  deleteFile() {
    this.outFile.removeCallback();
  }
};
