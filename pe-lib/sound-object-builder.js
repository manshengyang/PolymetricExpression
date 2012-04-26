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

/*
 * Sound-Object-Builder class
 * An utility class used by sound-object-parser to create various sound object.
 * 
 * built-in sound object types:
 *  pause
 *  seq
 *  simul
 *  audio
 */
function soundObjectBuilder(context) {
    
    function copyTo(x, y) {
        for (var attr in x) {
            y[attr] = x[attr];
        }
    }
    
    function createBufferSource(buffer, pitch, originalPlaybackRate) {
        var playbackRate = pitch ? Math.pow(2, pitch / 12.0) : 1;
        playbackRate /= originalPlaybackRate === undefined ? 1 : originalPlaybackRate;
        var source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.playbackRate.value = playbackRate;
        return source;
    }
    
    //play function for sound objects that play the sound once
    function playOnce(time, controlParams) {
        var gain = controlParams.gain;
        var source = createBufferSource(this.buffer, this.pitch, this.originalPlaybackRate);
        this.source = source;
        this.source.gain.value = gain;
        source.noteOn(time);
        this.endTime = time + this.duration;
    }
    
    //play function for sound objects that play continuous sound
    function playContinuousSound(time, controlParams) {
        var gain = controlParams.gain;
        var params = this.ADSRParams || controlParams.ADSRParams;
        var a = params.a;
        var d = params.d;
        var r = params.r;
        var s = this.buffer.duration - a - d - r;
        var maxAmp = (params.maxAmp || 1.2) * gain;
        var sustainAmp = (params.sustainAmp || 1) * gain;
        
        var source = createBufferSource(this.buffer, this.pitch, this.originalPlaybackRate);
        source.loop = true;
        var aEndTime = time + a;
        var dEndTime = time + a + d;
        var sEndTime = time + this.duration;
        var rEndTime = sEndTime + r;
        
        source.gain.value = 0;
        source.gain.setValueAtTime(0, time);
        source.gain.linearRampToValueAtTime(maxAmp, aEndTime);
        source.gain.linearRampToValueAtTime(sustainAmp, dEndTime);
        source.gain.setValueAtTime(sustainAmp, sEndTime);
        source.gain.linearRampToValueAtTime(0, rEndTime);
        console.log(time);
        console.log(rEndTime);
        source.noteOn(time);
        source.noteOff(rEndTime);
        this.source = source;
        this.endTime = time + this.duration;
    }
    
    function stopAudio(time) {
        if (this.source === undefined) return;
        if (time > this.endTime) return;
        this.source.noteOff(time);
    }
    
    //create a sound object that plays the audio buffer
    function createAudioObject(buffer, duration, continuous, ADSRParams, originalPlaybackRate) {
        return {
            buffer: buffer,
            duration: duration,
            play: continuous ? playContinuousSound : playOnce,
            fit: simpleFit,
            repeat: continuous ? continuousRepeat : simpleRepeat,
            stop: stopAudio,
            ADSRParams: ADSRParams,
            originalPlaybackRate: originalPlaybackRate,
        };
    }
    
    //simple fit function for sound objects
    //return a copy of the sound object with the duration changed
    function simpleFit(duration) {
        var obj = new Object();
        copyTo(this, obj);
        obj.duration = duration;
        return obj;
    }
    
    //fit function for sound objects that are groups
    //return a new sound object group with 
    //a playList resulting from calling fit on the objects in the original playList
    function groupFit(duration) {
        var durationScale = duration / this.duration;
        //generate a new play list 
        var list = this.playList.map(function(obj) {
            //scale the duration of the sub sound object
            return obj.fit(obj.duration * durationScale);
        });
        var group = new Object();
        copyTo(this, group);
        group.duration = duration;
        group.playList = list;
        return group;
    }
    
    //create a sound object that plays the specified sound object according to the specified durations
    function simpleRepeat(durations) {
        var obj = this;
        var list = new Array();
        durations.forEach(function(duration) {
            list.push(obj.fit(duration));
        });
        return seq(list);
    }
    
    //repeat function for sound object with continuous sound, simply use the total duration
    function continuousRepeat(durations) {
        var obj = new Object();
        copyTo(this, obj);
        var totalDuration = 0;
        durations.forEach(function(dur) {
            totalDuration += dur;
        });
        obj.duration = totalDuration;
        return obj;
    }
    
    //play a list of sound objects sequentially
    function playSeq(list, startTime, controlParams) {
        var acc = 0;
        list.forEach(function(obj) {
            obj.play(startTime + acc, controlParams);
            acc += obj.duration;
        });
    }
    
    //play a list of sound objects simultaneously
    function playSimul(list, startTime, controlParams) {
        list.forEach(function(obj) {
            obj.play(startTime, controlParams);
        });
    }
    
    //stop function for groups
    function groupStop(time) {
        this.playList.forEach(function(obj) {
            obj.stop();
        });
    }
    
    //create a sound object that plays the specified sound objects sequentially
    function seq(objects) {
        var duration = 0;
        objects.forEach(function(obj) {
            duration += obj.duration;
        });
        return {
            duration: duration,
            playList: objects,
            play: function(time, controlParams) {
                playSeq(this.playList, time, controlParams);
            },
            fit: groupFit,
            repeat: simpleRepeat,
            stop: groupStop,
        };
    }
    
    //create a sound object that plays the specified sound objects simultaneously
    function simul(objects) { 
        var duration = 0;
        //all the elements in objects should have the same duration
        if (objects.length > 0) 
            duration = objects[0].duration;
            
        return {
            duration: duration,
            playList: objects,
            play: function(time, controlParams) {
                playSimul(this.playList, time, controlParams);
            },
            fit: groupFit,
            repeat: simpleRepeat,
            stop: groupStop,
        };
    }
    
    //create a pause sound object
    function pause(duration) {
        return {
            duration: duration,
            play: function() {},
            fit: simpleFit,
            repeat: simpleRepeat,
            stop: function() {},
        };
    }
    
    this.seq = seq;
    this.simul = simul;
    this.pause = pause;
    this.createAudioObject = createAudioObject;
    this.updateContext = function(newContext) {
        context = newContext;
    }
}
        
