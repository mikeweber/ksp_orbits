/* global Decimal */
(function(namespace) {
  'use strict'

  namespace.Helper = {
    isBlank: function (x) {
      return (x === null || typeof x === 'undefined')
    },
    shadeRGBColor: function(color, percent) {
      // from http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
      var f = parseInt(color.slice(1), 16),
          t = percent < 0 ? 0 : 255,
          p = percent < 0 ? percent * -1 : percent,
          R = f >> 16,
          G = f >> 8 & 0x00FF,
          B = f & 0x0000FF
      return '#' + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1)
    },
    convertTimeToDate: function(t) {
      var year   = Math.floor(t / YEAR) + 1,
          day    = Math.floor((t % YEAR) / DAY) + 1,
          hour   = Math.floor(((t % YEAR) % DAY) / HOUR),
          minute = Math.floor((((t % YEAR) % DAY) % HOUR) / MIN)
      if (day < 100) {
        if (day < 10) day = '0' + '' + day
        day = '0' + '' + day
      }
      if (minute < 10) minute = '0' + '' + minute
      return 'Year ' + year + ', Day ' + day + ' ' + hour + ':' + minute
    },
    radianToDegrees: function(rad) {
      return rad.times(180).dividedBy('' + Math.PI)
    },
    roundTo: function(num, dec) {
      if (!num) return null

      var factor = new Decimal(10).toPower(dec)
      return num.times(factor).round().dividedBy(factor)
    },
    calcObjectDistance: function(obj1, obj2) {
      if (this.isBlank(obj1) || this.isBlank(obj2)) return null

      var coord1 = obj1.getCoordinates(),
          coord2 = obj2.getCoordinates()
      return this.calcCoordDistance(coord1, coord2)
    },
    calcCoordDistance: function(coord1, coord2) {
      return coord1.x.minus(coord2.x).toPower(2).plus(coord1.y.minus(coord2.y).toPower(2)).sqrt()
    },
    posToCoordinates: function(pos) {
      return {
        x: pos.r.times('' + Math.cos(pos.phi)),
        y: pos.r.times('' + Math.sin(pos.phi))
      }
    }
  }
})(FlightPlanner.Helper)
