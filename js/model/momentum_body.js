(function(namespace) {
  namespace.MomentumBody = {
    getHeading: function() {
      return 0
    },
    getPrograde: function(t) {
      return this.pos.phi.minus(this.getZenithAngle(t))
    },
    getZenithAngle: function(t) {
      var e = this.getEccentricity()
      if (0 <= e && e < 1) {
        // Equation 4.25 from http://www.braeunig.us/space/orbmech.htm
        var C  = this.getSystemMu().times(2).dividedBy(this.pos.r.times(this.getVelocity(t).toPower(2))),
        pe = this.getPeriapsis()

        return Math.asin(pe.dividedBy(this.pos.r).toPower(2).times(1 - C).plus(pe.dividedBy(this.pos.r).times(C)).sqrt())
      } else {
        var C = Math.cos(this.pos.phi),
            S = Math.sin(this.pos.phi),
            r = this.pos.r,
            v = this.getVelocity(t)

        return Math.acos(r.times(C).times(v.times(C)).plus(r.times(S).times(v.times(S))).dividedBy(r.times(v)))
      }
    },
    getSemiMajorAxis: function() {
      return this.a
    },
    getEccentricity: function() {
      return this.e
    },
    getMeanAnomaly: function(t) {
      return this.getInitMeanAnomaly().plus(this.getMeanMotion().times(t))
    },
    getTimeOfPeriapsis: function() {
      return this.last_pe
    },
    setTimeOfPeriapsis: function(t) {
      this.last_pe = t
    },
    getVelocity: function(t) {
      // equation 4.32, rearranged to solve for v
      var mu = this.getSystemMu(),
          a  = this.getSemiMajorAxis(),
          r  = this.getDistanceFromParent()

      return mu.times(r.times(2).minus(1 / a)).sqrt()
    }
  }
})(FlightPlanner.Model)
