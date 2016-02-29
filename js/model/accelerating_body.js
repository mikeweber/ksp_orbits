(function(namespace, helpers) {
  namespace.AcceleratingBody = {
    getHeading: function(t) {
      var heading = this.heading
      if (typeof heading === 'function') heading(t)

      if (this.use_absolute_heading) {
        return heading
      } else {
        return this.getCartesianPrograde().plus(heading)
      }
    },
    updateInitialMeanAnomaly: function(t) {
      this.setInitMeanAnomaly(this.getMeanAnomaly().minus(this.getMeanMotion().times(t)))
    },
    getMeanAnomaly: function() {
      var e = this.getEccentricity(),
          E = this.getEccentricAnomaly(),
          fn

      if (e.gt(1)) {
        fn = this.getCalculator().getHyperbolicMeanAnomaly
      } else {
        fn = this.getCalculator().getMeanAnomaly
      }

      return fn(e, E)
    },
    getEccentricAnomaly: function() {
      var e = this.getEccentricity(),
          f = this.getTrueAnomaly()

      if (e.gt(1)) {
        fn = this.getCalculator().getHyperbolicAnomaly
      } else {
        fn = this.getCalculator().getEccentricAnomaly
      }

      return fn(e, f)
    },
    getTrueAnomaly: function() {
      var a     = this.getSemiMajorAxis(),
          e     = this.getEccentricity(),
          r     = this.getDistanceFromParent(),
          theta = Math.acos(a.times(Decimal.ONE.minus(e.times(e))).minus(r).dividedBy(e.times(r)))

      if (this.getFlightPathAngle().lt(0)) theta = -theta

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
      var perpendicular = Math.PI / 2
      if (!this.orbitIsClockwise()) perpendicular = -perpendicular

      return this.getZenithAngle().plus(perpendicular)
    },
    orbitIsClockwise: function() {
      return this.getZenithAngle().lt(0)
    },
    getZenithAngle: function() {
      return helpers.clampRadians(this.getCartesianPrograde().minus(this.getCartesianAngle()))
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
    },
    getArgumentOfPeriapsis: function(t) {
      return this.pos.phi.plus(this.getTrueAnomaly(t))
    },
    getCalculator: function(e, f) {
      return {
        getHyperbolicMeanAnomaly: function(e, E) {
          return e.times(Math.sinh(E)).minus(E)
        },
        getMeanAnomaly: function(e, E) {
          return E.minus(e.times(Math.sin(E)))
        },
        getEccentricAnomaly: function(e, f) {
          var cosf = Math.cos(f),
              sinE = Math.sin(f) * Math.sqrt(1 - e * e) / (1 + e * cosf),
              cosE = e.plus(cosf).dividedBy(e.times(cosf).plus(1))

          return new Decimal(Math.atan2(sinE, cosE))
        },
        getHyperbolicAnomaly: function(e, f) {
          // http://control.asu.edu/Classes/MAE462/462Lecture05.pdf slide 24/31
          return new Decimal(Math.atanh(e.minus(1).dividedBy(e.plus(1)).sqrt().times(Math.tan(f.dividedBy(2)))))
        }
      }
    }
  }
})(FlightPlanner.Model, FlightPlanner.Helper.Helper)
