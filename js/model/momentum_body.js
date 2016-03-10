(function(namespace, helpers) {
  var eccentric_anomaly_tolerance = 1e-10, max_eccentricy_anomaly_tries = 30

  namespace.MomentumBody = {
    getHeading: function() {
      return new Decimal(0)
    },
    getCartesianPrograde: function(t) {
      return helpers.clampRadians(this.getCartesianAngle(t).plus(this.getFlightPathAngle(t)).plus(Math.PI / 2))
    },
    getCartesianAngle: function(t) {
      return helpers.clampRadians(this.getArgumentOfPeriapsis().plus(this.getTrueAnomaly(t)))
    },
    getArgumentOfPeriapsis: function() {
      return this.arg_of_pe
    },
    getZenithAngle: function(t) {
      return helpers.clampRadians(new Decimal(Math.PI / 2).minus(this.getFlightPathAngle(t)))
    },
    getFlightPathAngle: function(t) {
      var e = this.getEccentricity(),
          f = this.getTrueAnomaly(t)

      return new Decimal(Math.atan2(e.times(Math.cos(f)).plus(1), e.times(Math.sin(f)))).minus(Math.PI / 2).times(-1)
    },
    getDistanceFromParent: function(t) {
      // equation 4.43 from http://www.braeunig.us/space/orbmech.htm
      var a   = this.getSemiMajorAxis(),
          e   = this.getEccentricity(),
          v   = this.getTrueAnomaly(t)

      return a.times(Decimal.ONE.minus(e.toPower(2))).dividedBy(Decimal.ONE.plus(e.times(Math.cos(v))))
    },
    getTrueAnomaly: function(t) {
      var e = this.getEccentricity()
      // from OrbitNerd: http://orbitnerd.com/s/AnomalyConversions.zip
      var E    = this.getEccentricAnomaly(this.getMeanAnomaly(t)),
          cosE = Math.cos(E),
          sinf = Math.sin(E) * Math.sqrt(1 - e * e) / (1 - e * cosE),
          cosf = (cosE - e) / (1 - e * cosE)

      return new Decimal(Math.atan2(sinf, cosf))
    },
    getMeanAnomaly: function(t) {
      var M, e = this.getEccentricity()
      if (e > 1) {
        var E = this.getEccentricAnomaly(new Decimal(Math.PI / 2), e)
        M = E.minus(e.times(Math.sin(E)))
      } else {
        M = this.getInitMeanAnomaly().plus(this.getMeanMotion().times(t))
      }

      return helpers.clampRadians(M)
    },
    getEccentricAnomaly: function(M, e, E, tries) {
      if (typeof M === 'undefined') throw("Mean anomaly is required")
      if (typeof e === 'undefined') e = this.getEccentricity()
      if (typeof E === 'undefined') E = M
      if (typeof tries === 'undefined') tries = 1
      if (e.gt(1)) return this.getHyperbolicEccentricAnomaly(M, e, E)

      var F = E.minus(e.times(Math.sin(M))).minus(M)

      if (tries > max_eccentricy_anomaly_tries || F.abs().lt(eccentric_anomaly_tolerance)) {
        return E
      } else {
        E = E.minus(F.dividedBy(Decimal.ONE.minus(e.times(Math.cos(E)))))
        return this.getEccentricAnomaly(M, e, E, tries + 1)
      }
    },
    getHyperbolicEccentricAnomaly: function(M, e, H, tries) {
      // http://control.asu.edu/Classes/MAE462/462Lecture05.pdf slide 18
      var diff = H.minus(e.times(Math.sinh(M)).minus(M))

      if (tries > max_eccentricy_anomaly_tries || diff.abs().lt(eccentric_anomaly_tolerance)) {
        return H
      } else {
        H = H.plus(M.minus(e.times(Math.sinh(H))).plus(H).dividedBy(e.times(Math.cosh(H)).minus(1)))
        return this.getEccentricAnomaly(M, e, H, tries + 1)
      }
    },
    // Do nothing since this should not change
    updateInitialMeanAnomaly: function() {},
    // From http://www.projectpluto.com/kepler.htm
    kepler: function(e, mean) {
      if (mean == 0) return new Decimal(0)
      var is_neg = false

      if (e < 0.3) {
        curr = Math.atan2(Math.sin(mean), Math.cos(mean) - e)
        err = curr - e * Math.sin(curr) - mean
        curr -= err / (1 - e * Math.cos(curr))
        return curr
      }

      if (mean < 0) {
        mean = -mean
        is_neg = true
      }

      curr = mean
      thresh = thresh * Math.abs(1 - e)
      // up to 60 deg
      if (e > 0.8 && mean < Math.TAU / 6 || e > 1) {
        var trial = mean / Math.abs(1 - e)

        // cubic term is dominant
        if (trial * trial > 6 * Math.abs(1 - e)) {
        }
      }
    },
    getTimeOfPeriapsis: function() {
      return this.last_pe
    },
    setTimeOfPeriapsis: function(t) {
      this.last_pe = t
    },
    getVelocity: function(t) {
      return this.getVelocityAtDistance(this.getDistanceFromParent(t))
    },
    getVelocityAtPeriapsis: function() {
      return this.getVelocityAtDistance(this.getPeriapsis())
    },
    getVelocityAtDistance: function(r) {
      // equation 4.32, rearranged to solve for v
      var two = new Decimal(2),
          mu  = this.getSystemMu(),
          a   = this.getSemiMajorAxis()

      return mu.times(two.dividedBy(r).minus(Decimal.ONE.dividedBy(a))).sqrt()
    },
    getEccentricity: function() {
      return this.e
    },
    getSemiMajorAxis: function() {
      return this.a
    }
  }
})(FlightPlanner.Model, FlightPlanner.Helper.Helper)
