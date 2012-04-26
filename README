Polymetric Expression
====================
A CS1010R javascript project by Yang Mansheng and Yang Zhixing, supervised by Associate Professor Martin Henz 
and Srikumar Karaikudi Subramaniam, in collaboration with Lee Zhi Xin and Rose Marie Tan who worked on the 
Generative Grammar(https://github.com/rosemarietan/GenerativeGrammar/) Project.

Project Home Page
====================
http://fightangel.github.com/PolymetricExpression/

Bol Processor BP2 Docs - Polymetric Expression
====================
http://bolprocessor.sourceforge.net/docs/bp2-Polyrhy.html

http://bolprocessor.sourceforge.net/docs/bp2-Polymet.html

Using The Library
====================
1. The easiest way - use player-facade.js
Files needed: pe-lib/*, sample-manager.js, player-facade.js

player-facade.js provides an easy way to play polymetric expression, assuming you want to use sample-manager.js to load the samples.
There are 3 steps:
1. Create a playerFacade object
2. Call playerFacade.loadSamples to load the samples
   The sampleUrl is the url of the folder the sample files located in. The folder should contains a mapping.js file. 
   Look at "acoustic-kit" folder for an example of the structure of such folders.
3. Call playerFacade.play with the expression you want to play
(Optional) 
4. Call playerFacade.stop when you want to stop

The playerFacade class also exports other things like the player it uses to provide more control if needed. Look at the code for more information.

2. Need more control
Files needed: pe-lib/*

If you need more control, you can use pe-player.js directly but this way is a bit more complicated. Look at pe-player.js for more information.
You can use demo.js as an example.
