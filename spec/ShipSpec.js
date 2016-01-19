describe("Ship", function() {
  var sun, kerbin, duna, ship;

  beforeEach(function() {
    sun    = new FlightPlanner.Model.Sun(1.1723328e18, 2.616e8)
    kerbin = new FlightPlanner.Model.Planet('Kerbin', 6e5,   3.5316e12,    13599840256, -Math.PI,       0,    8.4159286e7)
    duna   = new FlightPlanner.Model.Planet('Duna',   3.2e5, 3.0136321e11, 20726155264, -Math.PI,       0.05, 4.7921949e7),
    sun.addChild(kerbin)
    sun.addChild(duna)
  })

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
    ship.setThrottle(1)
    ship.v = ship.getSystemMu().times(new Decimal(2).dividedBy(ship.pos.r).minus(new Decimal(1).dividedBy(ship.pos.r))).sqrt()
    expect(ship.getSemiMajorAxis().toNumber()).toEqual(7e5)
    ship.setThrottle(0)
    expect(ship.a.toNumber()).toEqual(7e5)
  })

  it("should not flip the neg/pos sign for true anomaly", function() {
    ship = new FlightPlanner.Model.Ship('Test Ship', 50, 0, { r: new Decimal(21386792525.273233165), phi: 2.5090367501324917 }, 0, 0)
    ship.setParent(sun)
    ship.setMaxAcceleration(0.2)
    ship.setThrottle(1)
    ship.v = new Decimal(6853.4337390285327712)
    ship.prograde = new Decimal(1.8866051129692694)
    var t = new Decimal(19128892)
    expect(ship.getTrueAnomaly()).toBeGreaterThan(0)
    ship.step(t, 64)
    expect(ship.getTrueAnomaly()).toBeGreaterThan(0)
  })

  it("should not flip the neg/pos sign for true anomaly", function() {
    ship = new FlightPlanner.Model.Ship('Test Ship', 50, 0, { r: new Decimal(21464775034.069883602), phi: 2.503885507952059 }, 0, 0)
    ship.setParent(sun)
    ship.setMaxAcceleration(0.2)
    ship.setThrottle(1)
    ship.v = new Decimal(5635.6267178618410972)
    ship.prograde = new Decimal(1.1384462632763914)
    var t = new Decimal(19152060)
    expect(ship.getTrueAnomaly(t)).toBeGreaterThan(0)
    ship.setThrottle(0)
    ship.step(t, 64)
    expect(ship.getTrueAnomaly(t + 64)).toBeGreaterThan(0)
  })

  it("switches to a child SOI", function() {
    var t = new Decimal(19168764)
    ship = new FlightPlanner.Model.Ship('Test Ship', 50, 0, { r: new Decimal(21491133345.12646), phi: 2.499663860685842 }, 0, 0)
    ship.setParent(sun)
    ship.v = new Decimal(5625.466201374885)
    ship.setMaxAcceleration(0.2)
    ship.t = t
    ship.setThrottle(0)
    expect(ship.getParent().name).toEqual(sun.name)
    duna.step(t, 64)
    ship.detectSOIChange(t)
    expect(ship.getParent().name).toEqual(duna.name)
    duna.step(t.plus(64), 64)
    ship.step(t.plus(64), 64)
    ship.detectSOIChange(t)
    expect(ship.getParent().name).toEqual(duna.name)
  })
})
