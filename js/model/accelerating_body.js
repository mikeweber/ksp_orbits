(function(namespace) {
  namespace.AcceleratingBody = {
    getEccentricity: function() {
      // Equation 4.27 from http://www.braeunig.us/space/orbmech.htm
      var p1 = this.pos.r.times(this.getVelocity().toPower(2)).dividedBy(this.parent.mu).minus(1).toPower(2),
          p2 = new Decimal(Math.sin(this.getZenithAngle())).toPower(2),
          p3 = new Decimal(Math.cos(this.getZenithAngle())).toPower(2)

      return p1.times(p2).plus(p3).sqrt()
    },
    getZenithAngle: function() {
      return this.getPrograde().minus(this.pos.phi)
    },
    getHeading: function() {
      if (this.use_absolute_heading) {
        return this.heading
      } else {
        return this.getPrograde().plus(this.heading)
      }
    },
    getPrograde: function() {
      return this.prograde
    },
    getMeanAnomaly: function() {
      var E = this.getEccentricAnomaly(),
          e = this.getEccentricity()

      return E.minus(e.times(E))
    },
    getEccentricAnomaly: function() {
      var e = this.getEccentricity(),
          r = this.pos.r,
          a = this.getSemiMajorAxis()

      return new Decimal(Math.acos(-e * (r / a - 1)))
    },
    getSemiMajorAxis: function() {
      var one= new Decimal(1),
          two= new Decimal(2),
          r  = this.pos.r,
          v  = this.v,
          mu = this.getSystemMu()
      return one.dividedBy(two.dividedBy(r).minus(v.toPower(2).dividedBy(mu)))
    },
    getVelocity: function() {
      return this.v
    }
  }
})(FlightPlanner.Model)
