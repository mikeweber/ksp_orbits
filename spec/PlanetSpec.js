describe("Planet", function() {
  var helpers = FlightPlanner.Helper.Helper
  var system = new FlightPlanner.SolarSystem()
  var sun = system.sun
  var duna = system.duna
  var kerbin = system.kerbin

  describe("system", function() {
    it("has a phase angle of 135 at the start time", function() {
      var phase = duna.getCartesianAngle(0).minus(kerbin.getCartesianAngle(0)).abs()
      expect(phase).toBeCloseTo(Math.PI * 3 / 4, 0)
    })

    it("has a phase angle of 0 at a certain time", function() {
      // t0 = Y1, D1, 0:00
      // Y1, D335, 0:21:56
      var t = 334 * (6 * 3600) + 0 * 3600 + 21 * 60 + 56
      var phase = duna.getCartesianAngle(t).minus(kerbin.getCartesianAngle(t)).abs()

      expect(phase).toBeCloseTo(0.00, 2)
    })
  })

  describe("circular orbit", function() {
    var p = kerbin.getSemiMajorAxis().toPower(3).dividedBy(kerbin.getSystemMu()).sqrt().times(Math.TAU)

    it("has a constant velocity", function() {
      expect(kerbin.getVelocity(0)).toBeCloseTo(9284.5, 1)
      expect(kerbin.getVelocity(1000000)).toBeCloseTo(9284.5, 1)
      expect(kerbin.getVelocity(2000000)).toBeCloseTo(9284.5, 1)
    })

    it("has a prograde that is always 90 degrees from the current phi", function() {
      expect(kerbin.getCartesianPrograde(0)).toBeCloseTo(-Math.PI / 2, 1)
      expect(kerbin.getCartesianPrograde(p / 2)).toBeCloseTo(Math.PI / 2, 1)
      expect(kerbin.getCartesianPrograde(p)).toBeCloseTo(-Math.PI / 2, 1)
      expect(kerbin.getCartesianPrograde(18752444)).toBeCloseTo(-1.335, 1)
    })

    it("has a zenith angle of 90 degrees", function() {
      expect(kerbin.getZenithAngle(0)).toBeCloseTo(Math.PI / 2, 1)
      expect(kerbin.getZenithAngle(p / 2)).toBeCloseTo(Math.PI / 2, 1)
      expect(kerbin.getZenithAngle(p)).toBeCloseTo(Math.PI / 2, 1)
      expect(kerbin.getZenithAngle(18752444)).toBeCloseTo(Math.PI / 2, 1)
    })

    it("has a flight path angle that is always 0 degrees", function() {
      expect(kerbin.getFlightPathAngle(0)).toBeCloseTo(0, 1)
      expect(kerbin.getFlightPathAngle(p / 2)).toBeCloseTo(0, 1)
      expect(kerbin.getFlightPathAngle(p)).toBeCloseTo(0, 1)
      expect(kerbin.getFlightPathAngle(18752444)).toBeCloseTo(0, 1)
    })
  })

  describe("eliptical orbit", function() {
    var p = duna.getSemiMajorAxis().toPower(3).dividedBy(duna.getSystemMu()).sqrt().times(Math.TAU)

    it("will have a variable velocity based on its location in orbit", function() {
      expect(duna.getVelocity(0)).toBeCloseTo(7154, 0)
      expect(duna.getVelocity(p / 4)).toBeCloseTo(7502, 0)
      expect(duna.getVelocity(p / 2)).toBeCloseTo(7907, 0)
      expect(duna.getVelocity(p * 3 / 4)).toBeCloseTo(7502, 0)
    })

    it("has a prograde that is changes based on the location in the orbit", function() {
      expect(duna.getCartesianPrograde(0)).toBeCloseTo(duna.getArgumentOfPeriapsis().plus(-Math.PI / 2), 1)
      expect(duna.getCartesianPrograde(p / 2)).toBeCloseTo(FlightPlanner.Helper.Helper.clampRadians(duna.getArgumentOfPeriapsis().plus(Math.PI / 2)), 1)
      expect(duna.getCartesianPrograde(p)).toBeCloseTo(FlightPlanner.Helper.Helper.clampRadians(duna.getArgumentOfPeriapsis().plus(-Math.PI / 2)), 1)
      expect(duna.getCartesianPrograde(p / 4)).toBeCloseTo(FlightPlanner.Helper.Helper.clampRadians(duna.getArgumentOfPeriapsis().plus(Math.TAU)), 0)
    })

    it("has a zenith angle of 90 degrees at apoaposis and periapsis", function() {
      expect(duna.getZenithAngle(0)).toBeCloseTo(Math.PI / 2, 1)
      expect(duna.getZenithAngle(p / 2)).toBeCloseTo(Math.PI / 2, 1)
      expect(duna.getZenithAngle(p)).toBeCloseTo(Math.PI / 2, 1)
    })

    it("has a positive flight path angle during ascent from periapsis to apoapsis", function() {
      expect(duna.getFlightPathAngle(0)).toBeCloseTo(0)
      expect(duna.getFlightPathAngle(p * 5 / 8)).toBeGreaterThan(0)
      expect(duna.getFlightPathAngle(p * 2 / 3)).toBeGreaterThan(0)
      expect(duna.getFlightPathAngle(p / 2)).toBeCloseTo(0)
    })

    it("has a negative flight path angle during descent from apoapsis to periapsis", function() {
      expect(duna.getFlightPathAngle(p / 2)).toBeCloseTo(0)
      expect(duna.getFlightPathAngle(p / 3)).toBeLessThan(0)
      expect(duna.getFlightPathAngle(p / 5)).toBeLessThan(0)
      expect(duna.getFlightPathAngle(p)).toBeCloseTo(0)
    })
  })
})

