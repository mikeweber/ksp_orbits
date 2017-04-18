(function (namespace, Planet, Sun) {
  namespace.SolarSystem = (function() {
    var klass = function SolarSystem () {
      this.sun    = new Sun(1.1723328e18, 2.616e8),
      this.kerbin = new Planet('Kerbin', 6e5,   3.5316e12,    13599840256, -Math.PI,       0,                      0,     8.4159286e7),
      this.duna   = new Planet('Duna',   3.2e5, 3.0136321e11, 20726155264, -Math.PI,       135.5 / 360 * Math.TAU, 0.051, 4.7921949e7),
      this.mun    = new Planet('Mün',    2.0e5, 6.5138398e10, 1.2e7,       -Math.PI * 1.7, 100 / 360 * Math.TAU,   0,     2.4295591e6),
      this.minmus = new Planet('Minmus', 6.0e4, 1.7658000e9,  4.7e7,       -Math.PI * 0.9, 170 / 360 * Math.TAU,   0,     2.2474284e6),
      this.ike    = new Planet('Ike',    1.3e5, 1.8568369e10, 3.2e6,       -Math.PI * 1.7, 100 / 360 * Math.TAU,   0.03,  1.0495989e6)

      this.kerbin.addChild(this.mun)
      this.kerbin.addChild(this.minmus)
      this.duna.addChild(this.ike)
      this.sun.addChild(this.kerbin)
      this.sun.addChild(this.duna)
    }

    klass.prototype.getPlanet = function(name) {
      for (var i = this.getPlanets().length; i--; ) {
        if (this.getPlanets()[i].name === name) return this.getPlanets()[i]
      }
    }

    klass.prototype.getPlanets = function() {
      return [this.ike, this.duna, this.minmus, this.mun, this.kerbin, this.sun]
    }

    return klass
  })()
})(FlightPlanner, FlightPlanner.Model.Planet, FlightPlanner.Model.Sun)

