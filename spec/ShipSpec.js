describe("Ship", function() {
  var system = new FlightPlanner.SolarSystem()
  var sun = system.sun, kerbin = system.kerbin, duna = system.duna, ship

  it("can change modes", function() {
    ship = new FlightPlanner.Model.Ship('Test Ship', 50, 0, { r: 7e5, phi: 0 }, 0, 0)
    ship.setParent(kerbin)
    ship.v = ship.getSystemMu().times(new Decimal(2).dividedBy(ship.pos.r).minus(new Decimal(1).dividedBy(ship.pos.r))).sqrt()
    expect(ship.getSemiMajorAxis().toNumber()).toEqual(7e5)
    ship.setMotionCalculator(FlightPlanner.Model.MomentumBody)
    ship.a = new Decimal(8e5)
    expect(ship.getSemiMajorAxis().toNumber()).toEqual(8e5)
    ship.setMotionCalculator(FlightPlanner.Model.AcceleratingBody)
    expect(ship.getSemiMajorAxis().toNumber()).toEqual(7e5)
  })

  it("should copy over the appropriate paremeters when calculation modes change", function() {
    ship = new FlightPlanner.Model.Ship('Test Ship', 50, 0, { r: 7e5, phi: 0 }, 0, 0)
    ship.setParent(kerbin)
    ship.setThrottle(1, 0)
    ship.v = ship.getSystemMu().times(new Decimal(2).dividedBy(ship.pos.r).minus(new Decimal(1).dividedBy(ship.pos.r))).sqrt()
    expect(ship.getSemiMajorAxis().toNumber()).toEqual(7e5)
    ship.setThrottle(0, 0)
    expect(ship.getSemiMajorAxis().toNumber()).toEqual(7e5)
  })

  it("should not flip the neg/pos sign for true anomaly", function() {
    ship = new FlightPlanner.Model.Ship('Test Ship', 50, 0, { r: new Decimal(21386792525.273233165), phi: 2.5090367501324917 }, 0, 0)
    ship.setParent(sun)
    ship.setMaxAcceleration(0.2)
    ship.setThrottle(1, 0)
    ship.v = new Decimal(6853.4337390285327712)
    ship.setCartesianPrograde(1.8866051129692694)
    var t = new Decimal(19128892)
    expect(ship.getTrueAnomaly()).toBeGreaterThan(0)
    ship.step(t, 64)
    expect(ship.getTrueAnomaly()).toBeGreaterThan(0)
  })

  it("switches to a parent SOI", function() {
    var t = new Decimal(6025180), step_size = 64
    ship = new FlightPlanner.Model.Ship('Test Ship', 50, 5240.5377575602381162, { r: new Decimal(84234601.5622399), phi: 1.6908811361804374 }, 2.6808776651911277, 0, false)
    ship.setParent(kerbin)
    ship.setMaxAcceleration(0.2)
    ship.setThrottle(1, t)
    expect(ship.getParent().name).toEqual(kerbin.name)
    kerbin.step(t, step_size)
    ship.step(t, step_size)
    expect(ship.getDistanceFromParent()).toBeGreaterThan(kerbin.getDistanceFromParent(t))
    expect(ship.getDistanceFromParent()).toBeLessThan(kerbin.getDistanceFromParent(t).plus(kerbin.soi * 2))
    expect(ship.getParent().name).toEqual(sun.name)
    expect(ship.getVelocity()).toBeGreaterThan(14400)
    expect(ship.getVelocity()).toBeLessThan(14600)
  })

  // Parameters from Duna intercept after launch from kerbin orbit at t = 6.0e6, altitude of 70000, initial_angle of Math.PI / 4 and a 64 second sim step
  it("switches to a child SOI", function() {
    var t = new Decimal(6395100), step_size = 64
    ship = new FlightPlanner.Model.Ship('Test Ship', 50, 12461.176912290647828, { r: new Decimal(20001253509.416050746), phi: 1.4579619279087053 }, 2.9585211285853155, 4.834911093874692, true)
    ship.setParent(sun)
    ship.setMaxAcceleration(0.2)
    ship.setThrottle(1, t)
    expect(ship.getParent().name).toEqual(sun.name)
    expect(ship.pos.r.toNumber()).toEqual(20001253509.416050746)
    expect(ship.pos.phi.toNumber()).toEqual(1.4579619279087053)
    expect(ship.getApoapsis().toNumber()).toBeCloseTo(-81534627337.5911, 2)
    expect(ship.getPeriapsis().toNumber()).toBeCloseTo(19922072596.537, 2)

    expect(ship.getMeanAnomaly(t)).toBeCloseTo(-0.018069764674722724, 5)
    expect(ship.getTrueAnomaly(t)).toBeCloseTo(-0.11286853026465728, 5)
    expect(ship.getFlightPathAngle(t).toNumber()).toBeCloseTo(0.0702371261182862, 5)
    expect(ship.getCartesianPrograde(t).toNumber()).toBeCloseTo(2.9585211285853155, 3)
    expect(ship.getVelocity(t)).toBeCloseTo(12461.17, 1)

    // Step forward and switch to Duna SOI
    duna.step(t.plus(step_size), step_size)
    ship.step(t.plus(step_size), step_size)
    expect(ship.getParent().name).toEqual(duna.name)
    expect(ship.getVelocity(t)).toBeCloseTo(4697.92, 1)
    expect(ship.getCartesianPrograde(t)).toBeCloseTo(2.903, 2)

    // Contiue stepping; should still be in Duna SOI
    duna.step(t.plus(2 * step_size), step_size)
    ship.step(t.plus(2 * step_size), step_size)
    expect(ship.getParent().name).toEqual(duna.name)
    expect(ship.getVelocity(t)).toBeCloseTo(4693.438, 0)
    expect(ship.getCartesianPrograde(t)).toBeCloseTo(2.906, 2)
  })
})
