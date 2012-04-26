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
 * Sound-Object-Parser class
 *  The only function it exports is parse(struct-object).
 *  The function returns a sound object, which can be used directly to play the sound.
 * 
 * SoundObject:
 *  duration
 *  playList: a list of sub sound objects contained by the sound object
 *  source: AudioBufferSourceNode for audio object
 *  endTime: the end time of the sound for audio object
 *  play(time, controlParams): play the sound object at a specified time
 *  stop(time): stop playing the sound object at a specified time
 *  fit(duration): return a new sound object that is produced by fitting the sound object into a specified duration
 *  repeat(durations): return a new sound object that repeats sound object according to the specified durations
 */
function soundObjectParser(builder) {
    
	function mapGroup(group, mapSymbol){
        return group.content.map(function (obj) {
            return createSoundObject(obj, mapSymbol);
        });
    };
    
	function createSoundObject(structObj, mapSymbol, unitTime) {
		unitTime = unitTime || 1;
		switch (structObj.type) {
			case "group":
				return builder.seq(mapGroup(structObj, mapSymbol));
			case "simul":
				return builder.simul(mapGroup(structObj, mapSymbol));
			case "symbol":
				try {
					var obj = mapSymbol(structObj.content, structObj.duration * unitTime);
					obj.pitch = structObj.pitch;
					return obj;
				} catch(error) {
					error.position = structObj.position;
					throw error;
				}
			case "repetition":
				return createSoundObject(structObj.content, mapSymbol, unitTime)
				       .repeat(structObj.repeat);
			default:
				//unidentified type
				throw createError("invalid struct object type : " + structObj.type);
		}
	};
	
	function createError(message) {
		return {
			message: message,
		};
	}
	
	this.parse = createSoundObject;
}
