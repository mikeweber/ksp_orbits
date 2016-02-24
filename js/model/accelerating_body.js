(function(namespace, helpers) {
  namespace.AcceleratingBody = {
    getHeading: function() {
      if (this.use_absolute_heading) {
        return this.heading
      } else {
        return this.getCartesianPrograde().plus(this.heading)
      }
    },
    updateInitialMeanAnomaly: function(t) {
      this.setInitMeanAnomaly(this.getMeanAnomaly().minus(this.getMeanMotion().times(t)))
    },
    getMeanAnomaly: function() {
      var E = this.getEccentricAnomaly(),
          e = this.getEccentricity()

      return E.minus(e.times(Math.sin(E)))
    },
    getEccentricAnomaly: function() {
      var e    = this.getEccentricity(),
          f    = this.getTrueAnomaly(),
          cosf = Math.cos(f),
          sinE = Math.sin(f) * Math.sqrt(1 - e * e) / (1 + e * cosf),
          cosE = e.plus(cosf).dividedBy(e.times(cosf).plus(1))

      var E = new Decimal(Math.atan2(sinE, cosE))
      if (e >= 1) {
      }

      return E
    },
    getTrueAnomaly: function() {
      var a     = this.getSemiMajorAxis(),
          e     = this.getEccentricity(),
          r     = this.getDistanceFromParent(),
          theta = Math.acos(a.times(Decimal.ONE.minus(e.times(e))).minus(r).dividedBy(e.times(r)))

      if (this.getZenithAngle() > 0) theta = -theta

      return new Decimal(theta)
    },
    getSemiMajorAxis: function() {
      var two = new Decimal(2),
          r   = this.pos.r,
          v   = this.v,
          mu  = this.getSystemMu()

      return Decimal.ONE.dividedBy(two.dividedBy(r).minus(v.toPower(2).dividedBy(mu)))
    },
    getEccentricity: function() {
      // Equation 4.27 from http://www.braeunig.us/space/orbmech.htm
      var p1 = this.getDistanceFromParent().times(this.getVelocity().toPower(2)).dividedBy(this.parent.mu).minus(1).toPower(2),
          p2 = new Decimal(Math.sin(this.getZenithAngle())).toPower(2),
          p3 = new Decimal(Math.cos(this.getZenithAngle())).toPower(2)

      return p1.times(p2).plus(p3).sqrt()
    },
    getFlightPathAngle: function() {
      return this.getZenithAngle().times(-1).plus(Math.PI / 2)
    },
    getZenithAngle: function() {
      return helpers.clampRadians(this.getCartesianPrograde().minus(this.pos.phi))
    },
    getCartesianAngle: function(t) {
      return this.pos.phi
    },
    getCartesianPrograde: function() {
      return this.prograde
    },
    getVelocity: function() {
      return this.v
    },
    getDistanceFromParent: function() {
      return this.pos.r
    }
  }
})(FlightPlanner.Model, FlightPlanner.Helper.Helper)
