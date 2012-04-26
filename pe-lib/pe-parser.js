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
 * PE-Parser class
 *  The only function it exports is parse(expression).
 *  The function returns a struct object.
 * 
 * struct object:
 *  type: string, symbol/group/simul/repetition
 *  content: depends on type
 *  duration: number, default value 1
 *  fit(duration): method, adjust the duration
 *  explicit: boolean, for group only, if it is a explicit group
 *  position: object{line, column}, for symbol and repetition only
 *  repeat: array of duration, for repetition only
 */

function peParser() { //constructor
	
	//processors that process the expression recursively to adjust the durations
	var recursiveProcessors = 
	[
		processSymbol,
		processGroup, 
		processTempo, 
		processSimultaneous, 
		processSequential
	];
	
	//processors that process the expression once at the final stage
	var finalProcessors = 
	[
		processRepetition,
	];
	
	function parsePE(expression) {
		return parse(expression);
	}
	
	function parse(expression) {
		var symbols = readSymbols(expression);
		var expBuilder = new expressionBuilder();
		
		//build the expression tree first
		expTree = expBuilder.buildExpression(symbols);
		//set the durations
		generateDuration(expTree);
		
		return expTree;
	}
	
	function generateDuration(expression) {
		process([expression], recursiveProcessors);
		process([expression], finalProcessors);
	}
	
	//pass the specified expressions through the specified processors
	function process(expressions, processors) {
		processors.forEach(function(processor) {
			expressions.forEach(function (expression) {
				processor(expression, processors);
			});
		});
	}
	
	//set the duration of a symbol/repetition to be 1
	//it sets the base for the later processing
	function processSymbol(expression, processors) {
		if (expression.type === "symbol" || expression.type === "repetition") {
		    //match id(pitch)
		    if (expression.type === "symbol" && expression.content.match("^[^\\(\\)]+\\(-?\\d+\\.?\\d*\\)$")) {
		        var openIndex = expression.content.indexOf("(");
		        var id = expression.content.substring(0, openIndex);
		        var pitch = parseFloat(expression.content.substring(openIndex + 1, expression.content.length - 1));
		        expression.content = id;
		        expression.pitch = pitch;
                // console.log(expression);
		    }
			expression.duration = 1;
			expression.fit = function(duration) {
				this.duration = duration;
			};
		}
	}
	
	//set the duration of the objects in each group
	function processGroup(expression, processors) {
		if (expression.type === "group") {
			process(expression.content, processors);
			
			expression.duration = getTotalDuration(expression.content);
			expression.fit = fitGroup;
		};
	}
	
	//set the duration of a simultaneous group
	function processSimultaneous(expression, processors) {
		if (expression.type === "simul") {
			process(expression.content, processors);
			unifyDuration(expression.content);
			
			expression.duration = 
				expression.content.length > 0 ? expression.content[0].duration : 0;
			expression.fit = fitGroup;
		}
	}
	
	//set the duration of a sequential group
	function processSequential(expression, processors) {
		if (expression.type === "sequence") {
			process(expression.content, processors);
			unifyDuration(expression.content);
			
			expression.duration = getTotalDuration(expression.content);
			
			//flatten content
			var flattened = new Array();
			expression.content.forEach(function (obj) {
				if (obj.type === "group" && obj.explicit === false) {
					obj.content.forEach(function (obj){
						flattened.push(obj);
					});
				} else {
					flattened.push(obj);
				}
			});
			
			expression.content = flattened;
			expression.fit = fitGroup;
			//no longer need special treatment, change to be a normal implicit group
			expression.type = "group";
			expression.explicit = false;
		}
	}
	
	//change the duration of the expression according to its tempo
	function processTempo(expression, processors) {
		if (expression.tempo !== undefined) {
			expression.fit(expression.duration / expression.tempo);
		}
	}
	
	//process repetition to change the duration of the corresponding object
	function processRepetition(expression, processors) {
		if (expression.type === "group" || expression.type == "simul") {
			process(expression.content, processors);
			
			var newContent = new Array();
			
			var currentObj = null;
			//storing the repetition duration sequence
			var repeat;
			
			//push currentObj to newContent if it is not null
			var pushCurrent = function() {
				if (currentObj !== null) {
					if (repeat.length > 1) {
						var rep = {
							type: "repetition",
							repeat: repeat,
							content: currentObj,
							fit: function(duration) {
								this.content.fit(duration);
							}
						};
						currentObj = rep;
					}
					newContent.push(currentObj);
				}
			};
			expression.content.forEach(function(obj) {
				if (obj.type === "repetition") {
					if (currentObj === null) { //cannot find the matching object
						throw createError("_ mismatch", obj.position);	
					}
					repeat.push(obj.duration);
				} else {
					pushCurrent();
					//create a new repetition sequence
					currentObj = obj;
					repeat = [obj.duration];
				}
			});
			//handle the "tail"
			pushCurrent();
			expression.content = newContent;
		}
	}
	
	// split the expression into symbols
	function readSymbols(expression) { 
		var symbols = new Array();
		var currentSymbol = "";
		
		var separator = "\\s";
		var specialChars = "[_,\.{}\-]";
		var identifierStart = "[a-z/]";
		var pushSymbol = function(line, column) {
			symbols.push(
				{
					content: currentSymbol, 
					position: {line: line, column: column},
				});
			currentSymbol = "";
		};
		
		//position counter
		var lineCounter = 0;
		var columnCounter = 0; 
		var inBraces = 0;
		for (var i = 0; i < expression.length; i++) {
			var currentChar = expression.charAt(i);
			if (currentChar == "(") inBraces++;
			else if (currentChar == ")") inBraces--;
			if (inBraces === 0 && currentChar.match(separator)) {	//identifier separator
				if (currentSymbol !== "") //end of an identifier
					pushSymbol(lineCounter, i - currentSymbol.length);
					
				if (currentChar === '\n') {//newline
					lineCounter++;
					columnCounter = -1;//reset columnCounter, avoid double counting
				}
			} else if (inBraces === 0 && currentChar.match(specialChars)) { //special char eg: , . { }
				if (currentSymbol !== "")//end of an identifier
					pushSymbol(lineCounter, i - currentSymbol.length);
					
				currentSymbol = currentChar;
				pushSymbol(lineCounter, i);
			} else if (currentSymbol !== "" || //continuation of an identifier
					   currentChar.match(identifierStart)) { //start of an identifier
				currentSymbol += currentChar;
			} else {
				throw createError("invalid character : " + currentChar, 
					{line: lineCounter, column: columnCounter});
			}
			
			columnCounter++;
		}
		if (currentSymbol !== "") // handle the "tail"
			pushSymbol(lineCounter, expression.length - currentSymbol.length);
		
		return symbols;
	}
	
	//get the total duration of the specified expressions
	function getTotalDuration(expressions) {
		var duration = 0;
		expressions.forEach(function (exp) {
			duration += exp.duration;
		});
		return duration;
	}
	
	//fit method for groups, set the duration of a group to be a specified value
	function fitGroup(duration) { 
		var scale = duration / this.duration;
		this.content.forEach(function (obj) {
			obj.fit(obj.duration * scale);
		});
		this.duration = duration;
	}
	
	//change the duration of every StructObject in the specified array to be 
	//that of the first one in the array
	function unifyDuration(objects) {
		if (objects.length === 0) 
			return objects;
			
		var duration = objects[0].duration;
		for (var i = 1; i < objects.length; i++) {
			objects[i].fit(duration);
		}
		return objects;
	}
	
	//construct a error containing the specified message and position info
	function createError(message, position) {
		return {
			message: message,
			position: position,
		};
	}
	
	this.parse = parsePE;
}
