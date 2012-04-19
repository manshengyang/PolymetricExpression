// Copyright (c) 2012 Mansheng Yang
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/* A player for PE
 *  add prototypes before you play a PE
 *  - play(expression, unitTime, stopCallback)
 *      unitTime : the length of a unit of time used in the PE, in seconds
 *  - stop()
 *  - addAudioPrototype(name, buffer, continuous?, ADSRParams)
 *    use this to add prototype that plays a audio buffer
 *  - addPrototype(name, soundObject)
 *    use this to add prototype of your own design
 */

function pePlayer(context) {

    var parser = new peParser();
    var builder = new soundObjectBuilder(context);
    var soundParser = new soundObjectParser(builder);
    
    var prototypes = {};
    
    function addAudioPrototype(name, buffer, continuous, ADSRParams, originalPlaybackRate) {
        var soundObj = builder.createAudioObject(buffer, 1, continuous, ADSRParams, originalPlaybackRate);
        addPrototype(name, soundObj);
    }
    
    function addPrototype(name, soundObject) {
        prototypes[name] = soundObject;
    }
    
    function removePrototype(name) {
        delete prototypes[name];
    }
    
    function mapSymbol(symbol, duration) {
        var prototype = prototypes[symbol];
        if (!prototype) {
            throw {
                message: "invalid sound identifier : " + symbol,
            };
        }
        return prototype.fit(duration);
    }
    
    var currentSoundObj = undefined;
    var onStopped = undefined;
    var stopTimeoutId = undefined;
    function play(exp, controlParams, unitTime, stopCallback) {
        stop();
        
        var structObj = parser.parse(exp);
        // console.log(structObj);
        var soundObj = soundParser.parse(structObj, mapSymbol, unitTime);
        // console.log(soundObj);
        
        currentSoundObj = soundObj;
        onStopped = stopCallback;
        soundObj.play(context.currentTime, controlParams);
        
        stopTimeoutId = setTimeout(raiseStopped, soundObj.duration * 1000);
    }
    
    function raiseStopped() {
        if (onStopped) {
            onStopped();
            onStopped = undefined;
        }
        if (stopTimeoutId) {
            clearTimeout(stopTimeoutId);
            stopTimeoutId = undefined;
        }
    }
    
    function stop() {
        if (currentSoundObj) {
            currentSoundObj.stop(context.currentTime);
            currentSoundObj = undefined;
            raiseStopped();
        }
    }
    
    //pause
    addPrototype("-", builder.pause(1));
    
    this.play = play;
    this.stop = stop;
    this.addPrototype = addPrototype;
    this.addAudioPrototype = addAudioPrototype;
    this.removePrototype = removePrototype;
}
