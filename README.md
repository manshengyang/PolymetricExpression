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
<ol>
	<li>
      <p>The easiest way</p>
      <p>Files needed: pe-lib/*, sample-manager.js, player-facade.js</p>
      <p>
      	player-facade.js provides an easy way to play polymetric expression, assuming you want to use sample-manager.js to load the samples.
      	<br/>
      	There are 4 steps:</p>
      <ol>
      	<li>
      		Create a playerFacade object
      	</li>
      	<li>
      		(Optional) Set playerFacade.continuousPredicate to enable adding continuous sound object
      	</li>
      	<li>
      		Call playerFacade.loadSamples to load the samples
      		<p>
      			The sampleUrl is the url of the folder the sample files located in. The folder should contains a mapping.js file. 
         		<br/>
         		Look at "acoustic-kit" folder for an example of the structure.
         	</p>
      	</li>
      	<li>
      		Call playerFacade.play with the expression you want to play
      	</li>
      	<li>
      		(Optional) Call playerFacade.stop when you want to
      	</li>
      </ol>
      The playerFacade class also exports other things like the player it uses to provide more detailed control. Look at the code for more information.
   </li>
   <li>
      <p>Need more control</p>
      <p>Files needed: pe-lib/*</p>
      
      <p>
      	If you need more control, you can use pe-player.js directly but this way is a bit more complicated. Look at pe-player.js for more information.
      	<br/>
      	You can use demo.js as an example.
      </p>
   </li>
</ol>
