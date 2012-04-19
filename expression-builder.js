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
expression:
	type: string, symbol/group/simul/sequence/repetition
	content: depends on type
	explicit: boolean, for group only, if it is a explicit group
	position: object{line, column}, for symbol and repetition only,
	tempo: number, for symbol only
*/
function expressionBuilder() {
	
	this.buildExpression = function(symbols) {
		return buildExpressionTree(symbols, 
			[
				processGroup, 
				processTempoMarker, 
				processRepetition,
				processComma, 
				processPeriod
			]);
	}
	
	function buildExpressionTree(symbols, expProcessers) {
		var expressions = symbols.map(symbolToExpression);
		return group(expressions, expProcessers, false);
	}
	
	//construct an expression item representing the symbol
	function symbolToExpression(symbol) {
		return {
			type: "symbol",
			content: symbol.content,
			position: symbol.position,
			tempo: 1,
			adjustTempo: function(factor) {
				this.tempo *= factor;
			},
		};
	}
	
	//pass the specified structObjects through the specified processors
	function process(expressions, processors) {
		processors.forEach(function(processor) {
			expressions = processor(expressions, processors);
		});
		return expressions;
	}
	
	//process grouping expression in the specified objects
	function processGroup(objects, processors) {
		var output = new Array();
		
		var currentGroup = false;
		var openCounter = 0; //counter for group opening
		var addNewObject = function(obj) {
			if (currentGroup) {
				currentGroup.push(obj);
			} else {
				output.push(obj);
			}
		}
		var openPosition = null; //for error message

		for (var i = 0; i < objects.length; i++) {
			var obj = objects[i];
			
			if (isSymbol(obj)) {
				if (obj.content === "{") {
					openCounter++;
					
					if (currentGroup === false) { //open group
						currentGroup = new Array();
						openPosition = obj.position;
					} else { //only handle one layer, ignore inner grouping
						currentGroup.push(obj);
					}
				} else if (obj.content === "}") {
					if (currentGroup) {
						openCounter--;
					
						if (openCounter === 0) { //close group
							output.push(group(currentGroup, processors, true));
							currentGroup = false;
							continue;
						} else if (openCounter > 0) {
							currentGroup.push(obj);
							continue;
						}
					}
					// error } mismatch
					
					// to be consistent with  the "{" case, position is not included in the message
					throw createError("} mismatch", obj.position);
				} else {
					addNewObject(obj);
				}
			} else {
				addNewObject(obj);
			}
		}
	
		if (openCounter > 0) {
			// error { mismatch
			throw createError("{ mismatch", openPosition);
		} else {
			return output;
		}
	}
	
	//process comma notation in the specified objects
	function processComma(objects, processors) {
		var groups = separateObjects(objects, function (obj) {
			return isSymbol(obj) && obj.content === ",";
		}, processors);
		
		if (groups === false) 
			return objects;
		return simqual(groups);
	}
	
	//process period notation in the specified objects
	function processPeriod(objects, processors) {
		var groups = separateObjects(objects, function (obj) {
			return isSymbol(obj) && obj.content === ".";
		}, processors);
		
		if (groups === false)
			return objects;
		return sequal(groups);
	}
	
	//use some objects as separators to separate the objects into groups
	//this is a helper function for comma and period processing
	function separateObjects(objects, separatorPredicate, processors) { 
		var output = new Array();
		var currentGroup = new Array();
		var pushGroup = function() {
			output.push(group(currentGroup, processors, false));
		};
		objects.forEach(function (obj) {
			if (separatorPredicate(obj)) {//start a new separation
				if (currentGroup.length > 0) {
					pushGroup();
					currentGroup = new Array();
				}
			} else {
				currentGroup.push(obj);
			}
		});
		if (currentGroup.length > 0) { //handle the "tail"
			if (output.length > 0) {
				pushGroup();
			} else { //no separator
				return false;
			}
		}
		return output;
	}
	
	//process tempo markers in the specified objects
	    //
    // I've generalized tempo markers to support arbitrary
    // fractions. While "/N" will speed up by a factor
    // of N, "/N*M" will speed up by a factor of "N/M".
    // This can be read as "shorten by a factor of N and
    // lengthen by a factor of M". Note that "*M" is not
    // a valid operator by itself and I'm not sure I want
    // to make it one, since "/1*M" serves the same purpose.
    // I've been using this locally for a couple of weeks
    // now and found it to be useful to express explicit
    // tempo. For example, a tempo of 100bpm can be expressed
    // as "/100*60" without the need for a special tempo
    // operator. Therefore I'm committing this feature.
    //   -Kumar (18 Feb 2012)
	function processTempoMarker(objects, processors) {
		var output = new Array();
		var pattern = "/([0-9]+)(\\*[0-9]+)?\\b"; //added boundary check
		var tempo = 1;
		objects.forEach( function (obj) {
		    var matchResult;
			if (isSymbol(obj) && (matchResult = obj.content.match(pattern))) {
                var newTempo = parseInt(matchResult[1]) / ((matchResult[2] && parseInt(matchResult[2].substr(1))) || 1);
				tempo *= newTempo;
			} else {
				obj.adjustTempo(tempo);
				output.push(obj);
			}
		});
		
		return output;
	}
	
	//process repetition in the specified objects
	function processRepetition(objects, processors) {
		objects.forEach(function(obj) {
			if (isSymbol(obj) && obj.content === "_") {
				//change the symbol to be repetition
				obj.type = "repetition";
				delete obj.content;
			}
		});
		return objects;
	}
	
	//construct a group containing the specified objects
	function group(objects, processors, explicit) { 
		var children = process(objects, processors);
		
		if (children.length === 1) { //for simplicity
			return children[0];
		}
		
		return {
			type: "group",
			content: children,
			explicit: explicit,
			adjustTempo: groupAdjustTempo,
		};
	}
	
	//construct a simultaneous group containing the specified object
	function simqual(objects) {
		return [{
			type: "simul", //simultaneous
			content: objects,
			adjustTempo: groupAdjustTempo,
		}];
	}
	
	//construct a sequential group containing the specified object
	function sequal(objects) {
		return [{
			type: "sequence", 
			content: objects,
			adjustTempo: groupAdjustTempo,
		}];
	}
	
	//adjust-tempo function for groups
	function groupAdjustTempo(factor) {
		this.content.forEach(function(child) {
			child.adjustTempo(factor);
		});
	}
	
	//construct a error containing the specified message and position info
	function createError(message, position) {
		return {
			message: message,
			position: position,
		};
	}
	
	function isSymbol(obj) {
		return obj.type === "symbol";
	}
}
