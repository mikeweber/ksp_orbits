# KSP Orbits
A 2D [Kerbal Space Program](http://kerbalspaceprogram.com) simulator that is useful for calculating continuous burns and planet interceptions in KSP.
[Preview](https://rawgit.com/mikeweber/ksp_orbits/master/index.html)

## FEATURES
* Simulates orbits of Kerbin, Duna and their respective moons
* Allows for a ship to be "launched" in a circular orbit around a body at a prescribed altitude, or placed in space by specifiying orbital parameters
* "Ship" can take conditional instructions for when to change heading or throttle
* Headings can either be "absolute" (using the x/y coordinate system used by the canvas, relative to the parent body) or "relative" (with 0 being prograde and -PI being retrograde)
* Renders elliptical orbits

## TODO
[x] Track fuel consumption
[ ] Fix issue with rendering conic sections when zoomed too far into a large ellipse
  [ ] Most likely caused by a floating point issue
  [ ] Possible fix: break ellipse into more segments when zoomed in by splitting the bezier curve http://pomax.github.io/bezierinfo/#splitting
[ ] Add parabolic and hyperbolic orbits to conic renderer
[ ] Add rest of planets and moons
[ ] Add panning and zooming directly with mouse
[ ] Automatically decrease step size for objects being calculated in cartesian coordinates when the throttle is set to 0 and the energy of the orbit changes too much
