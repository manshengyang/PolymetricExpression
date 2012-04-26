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

var audioContext = new webkitAudioContext();
var player = new pePlayer(audioContext);
var sampleList;
var addSoundButton;
var removeSoundButton;
var soundName;
var soundList;
var continuousCheck;
var gainText;
var attackText, decayText, releaseText, sustainGainText, maxGainText;
var controlParams = {gain: 0.1, ADSRParams: {a: 0.1, d: 0.1, r: 0.2, maxAmp: 1.5, sustainAmp: 1}};

function showMessage(msg) {
	$("#msg").html(msg);
}

function showLoading() {
    showMessage("Loading...");
}

function hideLoading() {
    showMessage("");
}

function init() {
    gainText.val(controlParams.gain);
    attackText.val(controlParams.ADSRParams.a);
    decayText.val(controlParams.ADSRParams.d);
    releaseText.val(controlParams.ADSRParams.r);
    sustainGainText.val(controlParams.ADSRParams.sustainAmp);
    maxGainText.val(controlParams.ADSRParams.maxAmp);
    
    showLoading();
    SampleManager.init(16, {
        didInitialize: loadSamples
    }, {
        audioContext: audioContext
    });
}

// Loads a bunch of wave tables. Note that
// the table frequency is relative to 20Hz,
// so your note number has to start roughly
// around 40. If you give numbers like 1 or 2,
// you'll get *very* low tones around 20Hz.
//
var waveTables = {};
function loadWaveTables(audioContext) {
    var names = {
        "Celeste" : "cel",
        "Organ_2" : "org",
    };

    var wave, table;

    // Synchronously load wave tables.
    // Automatically insert them into the
    // sound object prototype list.org
    for (var n in names) {
        wave = new WaveTable(n+'.js', 'sounds/wave-tables/', audioContext);
        wave.load(null, false);
        table = wave.getWaveDataForPitch(220.0);
        waveTables[names[n]] = table;
        table.baseFreq_Hz = 20.0;
        table.name = names[n];
        table.file = n;
        addWaveTablePrototype(table);
    }
}

var samples;

function loadSamples(sampleManager) {
    sampleManager.loadSampleSet("acoustic-kit", "acoustic-kit", {
       didFinishLoadingSampleSet: function(name, result) {
           hideLoading();
           samples = result;
           showSamples();
           for (name in samples) {
               addSoundPrototype(name, name, samples[name], name == "sine");
           }
       }
    });
    loadWaveTables(audioContext);
}

function showSamples() {
    for (name in samples) {
        sampleList.append('<option value="' + name + '">' + name + '</option>');
    }
}

function addWaveTablePrototype(table) {
    addSoundPrototype(table.name, table.name, table,  true, 20.0 / 440);
}

function addSoundPrototype(name, sampleName, buffer, continuous, originalPlaybackRate) {
    player.addAudioPrototype(name, buffer, continuous, null, originalPlaybackRate);
    var oldItem = $('option[value="' + name + '"]', soundList);
    oldItem.detach();
    var text = name + "(" + sampleName + (continuous ? ", continuous" : "") + ")";
    soundList.append('<option value ="' + name + '">' + text + '</option>');
}

function enableButton(button) {
    button.removeAttr("disabled");
}

function disableButton(button) {
    button.attr("disabled", "true");
}

function setControlParam(obj, name, text) {
    var val = parseFloat(text.val());
    if (isNaN(val)) {
        text.val(obj[name]);
        return;
    }
    obj[name] = val;
}

function updateControlParams() {
    setControlParam(controlParams, "gain", gainText);
    setControlParam(controlParams.ADSRParams, "a", attackText);
    setControlParam(controlParams.ADSRParams, "d", decayText);
    setControlParam(controlParams.ADSRParams, "r", releaseText);
    setControlParam(controlParams.ADSRParams, "sustainAmp", sustainGainText);
    setControlParam(controlParams.ADSRParams, "maxAmp", maxGainText);
}

$(function() {
    sampleList = $("#sample-list");
    addSoundButton = $("#add-sound");
    removeSoundButton = $("#remove-sound");
    soundName = $("#sound-name");
    soundList = $("#sound-list");
    continuousCheck = $("#is-continuous");
    gainText = $("#gain");
    attackText = $("#attack");
    decayText = $("#decay");
    releaseText = $("#release");
    sustainGainText = $("#sustain-gain");
    maxGainText = $("#max-gain");
    
    disableButton(addSoundButton);
    disableButton(removeSoundButton);
    sampleList.change(function() {
        var selected = $("option:selected", sampleList);
        if (selected.size() > 0) {
            enableButton(addSoundButton);
            soundName.val(selected.val());
        } else {
            disableButton(addSoundButton);
        }
    });
    addSoundButton.click(function() {
        var name = soundName.val();
        var sampleName = $("option:selected", sampleList).val();
        addSoundPrototype(name, sampleName, samples[sampleName], continuousCheck.prop("checked"));
    });
    soundList.change(function() {
        var selected = $("option:selected", soundList);
        if (selected.size() > 0) {
            enableButton(removeSoundButton);
        } else {
            disableButton(removeSoundButton);
        }
    });
    removeSoundButton.click(function() {
       var selected = $("option:selected", soundList);
       player.removePrototype(selected.val());
       selected.detach();
       disableButton(removeSoundButton);
    });
    init();
});

function playExp(exp, stopCallback) {
	showMessage("");
	updateControlParams();
	if (audioContext.currentTime > 500) {
	    audioContext = new webkitAudioContext();
	    player.updateContext(audioContext);
	}
	try {
       player.play(exp, controlParams, 1, stopCallback);
	} catch(error) {
		if (error.position !== undefined) {
			showMessage(error.message + ", at line " + error.position.line + " column " + error.position.column);
		} else {
			showMessage(error.message);
		}
		stopCallback();
	}
}

function stop() {
    player.stop();
}
