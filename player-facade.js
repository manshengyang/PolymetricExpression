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
 * Player-Facade class
 *  This class provides basic sample loading and PE playing functionalities, using sampel-manager and pe-player
 *  
 *  - audioContext : webkitAudioContext
 *  - player : pePlayer
 *  - controlParams
 *  - continuousPredicate : function(string)
 *    This function is used in sample loading to test whether a sample should be added as continuous sound object.
 *    Set a valid value before calling loadSamples() to this field to enable continuous control
 * 
 *  - loadSamples(sampleUrl, callback)
 *    Load samples using sample-manager. Provides the callback argument if you want to get notified when the loading is done.
 *  - play(expression, stopCallback)
 *    Play expression using pe-player
 *  - stop()
 *    Stop playing the current expression
 */

function playerFacade() {
    
    function loadSamples(sampleManager, sampleUrl, facade) {
        sampleManager.loadSampleSet(sampleUrl, sampleUrl, {
           didFinishLoadingSampleSet: function(name, result) {
               facade.samples = result;
               for (name in result) {
                   facade.player.addAudioPrototype(name, result[name], facade.continuousPredicate && facade.continuousPredicate(name));
               }
           }
        });
    }
    
    this.audioContext = new webkitAudioContext();
    this.player = new pePlayer(audioContext);
    this.controlParams = {gain: 0.2, ADSRParams: {a: 0.1, d: 0.1, r: 0.2, maxAmp: 1.5, sustainAmp: 1}};

    this.play = function(expression, stopCallback) {
        this.player.play(expression, this.controlParams, 1, stopCallback);
    }
    this.stop = function() {
        this.player.stop();
    }
    
    this.loadSamples = function(sampleUrl, callback) {
        var facade = this;
        SampleManager.init(16, {
            didInitialize: function(sampleManager) {
                loadSamples(sampleManager, sampleUrl, facade);
                if (callback) callback();
            }
        }, {
            audioContext: this.audioContext
        });
    }
}
