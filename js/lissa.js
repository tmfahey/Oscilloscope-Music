/**
 * Lissa Juice: Online audio visualization
 *
 * Matt Tytel and Noura Howell
 *
 * Copyright (c) 2013
 * Under MIT and GPL licenses:
 *  http://www.opensource.org/licenses/mit-license.php
 *  http://www.gnu.org/licenses/gpl.html
 */

var lissa = {};

lissa.harmonograph_type = null; // 'rotary' or 'lateral'

lissa.constants = {};

lissa.smoothValue = function(x, decay_rate) {
  var DEFAULT_DECAY = 0.99;

  var decay_rate_ = decay_rate || DEFAULT_DECAY;
  var target_ = x;
  var val_ = 0;

  function set(x) {
    target_ = x;
  }

  function tick() {
    val_ = decay_rate_ * val_ + (1 - decay_rate_) * target_;
    return val_;
  }

  function get() {
    return target_;
  }

  return {
    tick: tick,
    set: set,
    get: get,
  };
}

lissa.waveforms = function() {
  var SIN_RESOLUTION = 4096;
  var SIN_LOOKUP = [];
  for (var i = 0; i < SIN_RESOLUTION + 1; i++) {
    SIN_LOOKUP.push(Math.sin(2 * Math.PI * i / SIN_RESOLUTION));
  }

  function saw(t) {
    return 2 * (t - Math.floor(t)) - 1;
  }

  function sin(t) {
    // Linear interpolate sin lookup for speed (sshhh, no one will notice).
    var normal = t - Math.floor(t);
    var index = Math.floor(normal * SIN_RESOLUTION);
    var prog = normal * SIN_RESOLUTION - index;
    return (1 - prog) * SIN_LOOKUP[index] + prog * SIN_LOOKUP[index + 1];
  }

  function sqr(t) {
    var normal = t - Math.floor(t);
    if (normal < 0.5)
      return 1;
    return -1;
  }

  function tri(t) {
    // This is phased offset by 90 degrees.
    var normal = t - Math.floor(t);
    return 1 - 2 * Math.abs(1 - 2 * normal);
  }

  return {
    saw: saw,
    sin: sin,
    sqr: sqr,
    tri: tri,
  };
}();

lissa.oscillator = function() {
  var AMP_DECAY = 0.99997;
  var FREQ_DECAY = 0.9997;
  var PHASE_DECAY = 0.9997;

  var sample_rate = 44100.0;
  var amps_ = {};
  var current_phase_ = 0.0;
  var frequency_ = lissa.smoothValue(0.0, FREQ_DECAY);
  var phase_offset_ = lissa.smoothValue(0.0, PHASE_DECAY);

  function tick() {
    phase_offset = phase_offset_.get();
    frequency = frequency_.get();
    current_phase_ += frequency / sample_rate;
    if (current_phase_ > 1.0){
      current_phase_ -= 1.0;
    }


    var val1 = 0.0;
    var val2 = 0.0;
    _.each(amps_, function(amp, type) {
      val1 += amp.tick() * lissa.waveforms[type](current_phase_ + phase_offset);
      val2 += amp.tick() *
              lissa.waveforms[type](current_phase_ + phase_offset + 0);
    });

    return [val1, val2];
  }

  function setAmp(type, val) {
    if (amps_[type])
      amps_[type].set(val);
    else
      amps_[type] = lissa.smoothValue(val, AMP_DECAY);
  }

  function setSampleRate(rate) {
    sample_rate = rate;
  }

  function getAmp(type) {
    if (amps_[type]) {
      return amps_[type].get();
    }
    else {
      return 0;
    }
  }

  return {
    tick: tick,
    setFreq: frequency_.set,
    setPhase: phase_offset_.set,
    setAmp: setAmp,
    setSampleRate: setSampleRate,
    getFreq: frequency_.get,
    getPhase: phase_offset_.get,
    getAmp: getAmp,
  };
}


lissa.synth = function() {
  var DEFAULT_FREQ = 200.0;

  function init(buffer_size) {
    this.left = lissa.oscillator();
    this.left.setAmp('sin', 0.7);
    this.left.setFreq(DEFAULT_FREQ);
    this.left.setPhase(0.0);

    this.right = lissa.oscillator();
    this.right.setAmp('sin', 0.7);
    this.right.setFreq(DEFAULT_FREQ);
    this.right.setPhase(0.25);

    this.buffer_size = buffer_size;

    this.output = [];
    for (var i = 0; i < buffer_size; i++)
      this.output.push([[0.0, 0.0], [0.0, 0.0]]);
  }

  function clip(s) {
    if (s >= 1)
      return 1;
    if (s <= -1)
      return -1;
    return s;
  }

  function setSampleRate(sample_rate) {
    this.left.setSampleRate(sample_rate);
    this.right.setSampleRate(sample_rate);
  }

  function process() {
    for (var i = 0; i < this.buffer_size; ++i) {
      this.output[i][0] = this.left.tick();
      this.output[i][1] = this.right.tick();
    }
  }

  return {
    init: init,
    process: process,
    setSampleRate: setSampleRate,
    buffer_size: 0,
    left: null,
    right: null,
    output: null,
  };
}();

lissa.figure = function() {
  var BUFFER_MAX = 4096;
  var BORDER = 10;
  var COLOR_DECAY = 0.01;

  var figure_context_ = null;
  var osc_width_ = 0;
  var osc_height_ = 0;
  var points = [];
  var red_ = lissa.smoothValue(255, COLOR_DECAY);
  var green_ = lissa.smoothValue(255, COLOR_DECAY);
  var blue_ = lissa.smoothValue(0, COLOR_DECAY);
  var counter = 0;

  function init() {
    // Setup oscilloscope
    var osc = document.getElementById('oscilloscope');
    osc_width = document.getElementById('osc-container').offsetWidth - 100;
    osc_width_ = osc.width = osc_width;
    osc_height_ = osc.height = osc_width;
    osc_context_ = osc.getContext('2d');

    // Setup left channel
    var lchannel = document.getElementById('left-channel');
    lchannel_width = document.getElementById('lchannel-container').offsetWidth - 100;
    lchannel_width_ = lchannel.width = lchannel_width;
    lchannel_height_ = lchannel.height = lchannel_width/1.5;
    lchannel_context_ = lchannel.getContext('2d');

    // Setup right channel
    var rchannel = document.getElementById('right-channel');
    rchannel_width = document.getElementById('rchannel-container').offsetWidth - 100;
    rchannel_width_ = rchannel.width = rchannel_width;
    rchannel_height_ = rchannel.height = rchannel_width/1.5;
    rchannel_context_ = rchannel.getContext('2d');
  }

  function draw() {
    window.requestAnimationFrame(draw);
    if (points.length === 0){
      return;
    }

    // Fadeout drawings a bit
    osc_context_.globalAlpha = 0.3;
    osc_context_.fillStyle = 'black';
    osc_context_.fillRect(0, 0, osc_width_ + 2 * BORDER, osc_height_ + 2 * BORDER);
    lchannel_context_.globalAlpha = 0.3;
    lchannel_context_.fillStyle = 'black';
    lchannel_context_.fillRect(0, 0, osc_width_ + 2 * BORDER, osc_height_ + 2 * BORDER);
    rchannel_context_.globalAlpha = 0.3;
    rchannel_context_.fillStyle = 'black';
    rchannel_context_.fillRect(0, 0, osc_width_ + 2 * BORDER, osc_height_ + 2 * BORDER);
    var drawing_width = Math.min(osc_width_, osc_height_);

    // Prepare to draw.
    osc_context_.globalAlpha = 1;
    lchannel_context_.globalAlpha = 1;
    rchannel_context_.globalAlpha = 1;
    red = Math.floor(red_.tick());
    green = Math.floor(green_.tick());
    blue = Math.floor(blue_.tick());
    osc_context_.fillStyle = lchannel_context_.fillStyle =
      rchannel_context_.fillStyle = 'rgb(' + red + ',' + green + ',' + blue + ')';

    var drawpoints = points.splice(0, lissa.synth.buffer_size);

    // Draw it
    if (lissa.harmonograph_type === 'lateral') {
      for (var i = 1; i < drawpoints.length; i++) {
        var x = osc_height_ / 2 + drawpoints[i][0][0] * (drawing_width / 2 - BORDER);

        var y = osc_width_ / 2 - drawpoints[i][1][0] * (drawing_width / 2 - BORDER);
        osc_context_.fillRect(x, y, 1, 5);
      }
    } else { // 'rotary' or 'rotaryinv'
      var sign = lissa.harmonograph_type === 'rotary' ? 1 : -1;
      for (var i = 0; i < drawpoints.length; i++) {
        var osc_x = (drawpoints[i][0][0] + drawpoints[i][1][0]) * 0.5;
        var osc_y = (drawpoints[i][0][1] + sign * drawpoints[i][1][1]) * 0.5;
        var x = osc_width_ / 2 + osc_x * (drawing_width / 2 - BORDER);
        var y = osc_height_ / 2 + osc_y * (drawing_width / 2 - BORDER);
        osc_context_.fillRect(x, y, 1, 5);
      }
    }
    /*
    for (var i = 0; i < drawpoints.length; i++) {
      var x = osc_width_ / 2.3 + i;
      var y = osc_height_ / 4 - drawpoints[i][0][0] * (drawing_width / 2 - BORDER);
      figure_context_.fillRect(x, y, 1, 5);

      var x = osc_height_ / 2.3 + i;
      var y = osc_height_ -300.0 - drawpoints[i][1][0] * (drawing_width / 2 - BORDER);
      figure_context_.fillRect(x, y, 1, 5);
    }*/

    
    var leftCrosspoint = findFirstPositiveZeroCrossing(drawpoints, drawpoints.length, 0)
    var leftDrawpoints = drawpoints.slice(leftCrosspoint, lissa.synth.buffer_size);
    var rightCrosspoint = findFirstPositiveZeroCrossing(drawpoints, drawpoints.length, 1)
    var rightDrawpoints = drawpoints.slice(rightCrosspoint, lissa.synth.buffer_size);
    var leftLimit = (leftDrawpoints.length<512) ? leftDrawpoints.length : 512;
    var rightLimit = (rightDrawpoints.length<512) ? rightDrawpoints.length : 512;
    rotate(drawpoints,findFirstPositiveZeroCrossing(drawpoints, drawpoints.length, 0));
    for (var i = 0; i < leftLimit; i++) {
      var x = i;
      var y = rchannel_height_ / 2 - leftDrawpoints[i][0][0] * (drawing_width / 4 - BORDER);
      lchannel_context_.fillRect(x, y, 1, 5);
    }
    rotate(drawpoints,findFirstPositiveZeroCrossing(drawpoints, drawpoints.length, 1));
    for (var i = 0; i < rightLimit; i++) {
      var x = i;
      var y = rchannel_height_ /2 - rightDrawpoints[i][1][0] * (drawing_width / 4 - BORDER);
      rchannel_context_.fillRect(x, y, 1, 5);
    }
    

  }

  function findFirstPositiveZeroCrossing(buf, buflen, channel_index) {
    var first_crossing = 0;
    var isNegative = false;
    for(var i = 0; i < buflen; i++){
      if(!isNegative && buf[i][channel_index][0]<0){
        isNegative = true;
      }
      if(buf[i][channel_index][0]>0 && isNegative){
        return i;
      }
    }
    return 0;
  }

  function rotate( array , times ){
    while( times-- ){
      var temp = array.shift();
      array.push( temp )
    }
  }

  function setColor(r, g, b) {
    red_.set(r);
    green_.set(g);
    blue_.set(b);
  }

  function process(osc_buffers) {
    points.push.apply(points, osc_buffers);
  }

  return {
    init: init,
    draw: draw,
    setColor: setColor,
    process: process,
  };
}();

lissa.process = function(buffer) {
  var output_left = buffer.outputBuffer.getChannelData(0);
  var output_right = buffer.outputBuffer.getChannelData(1);
  var size = output_left.length;
  
  if (lissa.active) {
    lissa.synth.setSampleRate(buffer.outputBuffer.sampleRate);
    lissa.synth.process();
    lissa.figure.process(lissa.synth.output);
    for (var i = 0; i < size; ++i) {
      output_left[i] = lissa.synth.output[i][0][0];
      output_right[i] = lissa.synth.output[i][1][0];
    }
  }
  else {
    for (var i = 0; i < size; ++i) {
      output_left[i] = 0.0;
      output_right[i] = 0.0;
    }
  }
}
