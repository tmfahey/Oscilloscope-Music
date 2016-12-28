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
  var channel_state_ = [false, false];
  var operator_ = '+';
  var low_cut_ = lissa.smoothValue(0.0);
  var high_cut_ = lissa.smoothValue(1.0);

  function tick() {
    low_cut = low_cut_.get();
    high_cut = high_cut_.get();
    phase_offset = phase_offset_.get();
    frequency = frequency_.get();
    current_phase_ += frequency / sample_rate;
    if (current_phase_ > 1.0){
      current_phase_ -= 1.0;
    }

    var val = 0.0;
    if((current_phase_>low_cut) && (current_phase_<high_cut)){
      _.each(amps_, function(amp, type) {
        val += amp.tick() * lissa.waveforms[type](current_phase_ + phase_offset);
      });     
    }

    return val;
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

  function setChannels(channel_state){
    channel_state_ = channel_state;
  }

  function getChannels(){
    return channel_state_;
  }

  function isEnabled(){
    return channel_state_[0] || channel_state_[1];
  }

  function setOperator(operator){
    operator_ = operator;
  }

  function getOperator(){
    return operator_;
  }

  return {
    tick: tick,
    setFreq: frequency_.set,
    setPhase: phase_offset_.set,
    setAmp: setAmp,
    setSampleRate: setSampleRate,
    setLowCut: low_cut_.set,
    setHighCut: high_cut_.set,
    getFreq: frequency_.get,
    getPhase: phase_offset_.get,
    getAmp: getAmp,
    getLowCut: low_cut_.get,
    getHighCut: high_cut_.get,
    setChannels: setChannels,
    getChannels: getChannels,
    isEnabled: isEnabled,
    setOperator: setOperator,
    getOperator: getOperator,
  };
}


lissa.synth = function() {
  var DEFAULT_FREQ = 200.0;
  var OSCILLATOR_COUNT = 4;
  var oscillators_ = [];
  var operators = {
    '+': function(a, b) { return a + b },
    '-': function(a, b) { return a - b },
    '/': function(a, b) { return a / b },
    '*': function(a, b) { return a * b }
  };

  function init(buffer_size) {
    //create 4 oscillators
    for(var i=0; i<OSCILLATOR_COUNT; i++){
      var osc = lissa.oscillator();
      osc.setFreq(DEFAULT_FREQ);
      osc.setOperator('+');
      osc.setChannels([false,false]);
      oscillators_.push(osc);
    }
    oscillators_[0].setAmp('sin', 0.7);
    oscillators_[0].setChannels([true,false]);
    oscillators_[0].setPhase(0.0);
    oscillators_[1].setAmp('sin', 0.7);
    oscillators_[1].setChannels([false,true]);
    oscillators_[1].setPhase(0.25);

    this.oscillators = oscillators_;

    this.buffer_size = buffer_size;

    this.output = [];
    for (var i = 0; i < buffer_size; i++)
      this.output.push([0.0, 0.0]);
  }

  function clip(s) {
    if (s >= 1)
      return 1;
    if (s <= -1)
      return -1;
    return s;
  }

  function setSampleRate(sample_rate) {
    _.each(oscillators_, function(osc){
      osc.setSampleRate(sample_rate);   
    });
  }

  function process() {
    for (var i = 0; i < this.buffer_size; ++i) {
      var left_value_ = 0;
      var right_value_ = 0;
      _.each(oscillators_, function(osc){
        if(osc.isEnabled()){
          var osc_channel_config_ = osc.getChannels();
          if(osc_channel_config_[0]){
            left_value_ = operators[osc.getOperator()](left_value_, osc.tick());
          }
          if(osc_channel_config_[1]){
            right_value_ = operators[osc.getOperator()](right_value_, osc.tick());
          } 
        }
      });
      this.output[i][0] = left_value_;
      this.output[i][1] = right_value_;
    }
  }

  return {
    init: init,
    process: process,
    setSampleRate: setSampleRate,
    buffer_size: 0,
    oscillators: null,
    output: null,
  };
}();

lissa.figure = function() {
  var BUFFER_MAX = 4096;
  var BORDER = 2;
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
    osc_context_.globalAlpha = 0.9;
    osc_context_.fillStyle = 'black';
    osc_context_.fillRect(0, 0, osc_width_ + 2 * BORDER, osc_height_ + 2 * BORDER);
    lchannel_context_.globalAlpha = 0.9;
    lchannel_context_.fillStyle = 'black';
    lchannel_context_.fillRect(0, 0, osc_width_ + 2 * BORDER, osc_height_ + 2 * BORDER);
    rchannel_context_.globalAlpha = 0.9;
    rchannel_context_.fillStyle = 'black';
    rchannel_context_.fillRect(0, 0, osc_width_ + 2 * BORDER, osc_height_ + 2 * BORDER);

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
    for (var i = 1; i < drawpoints.length; i++) {
      var x = osc_height_ / 2 + drawpoints[i][0] * (osc_height_ / 2 - BORDER);

      var y = osc_width_ / 2 - drawpoints[i][1] * (osc_width_ / 2 - BORDER);
      osc_context_.fillRect(x, y, 1, 5);
    }

    
    var leftCrosspoint = findFirstPositiveZeroCrossing(drawpoints, drawpoints.length, 0)
    var leftDrawpoints = drawpoints.slice(leftCrosspoint, lissa.synth.buffer_size);
    var rightCrosspoint = findFirstPositiveZeroCrossing(drawpoints, drawpoints.length, 1)
    var rightDrawpoints = drawpoints.slice(rightCrosspoint, lissa.synth.buffer_size);
    var leftLimit = (leftDrawpoints.length<512) ? leftDrawpoints.length : 512;
    var rightLimit = (rightDrawpoints.length<512) ? rightDrawpoints.length : 512;
    rotate(drawpoints,findFirstPositiveZeroCrossing(drawpoints, drawpoints.length, 0));
    for (var i = 0; i < leftLimit; i++) {
      var x = i;
      var y = lchannel_height_ / 2 - leftDrawpoints[i][0] * (lchannel_height_ / 2 - BORDER);
      lchannel_context_.fillRect(x, y, 1, 5);
    }
    rotate(drawpoints,findFirstPositiveZeroCrossing(drawpoints, drawpoints.length, 1));
    for (var i = 0; i < rightLimit; i++) {
      var x = i;
      var y = rchannel_height_ /2 - rightDrawpoints[i][1] * (rchannel_height_ / 2 - BORDER);
      rchannel_context_.fillRect(x, y, 1, 5);
    }
    

  }

  function findFirstPositiveZeroCrossing(buf, buflen, channel_index) {
    var first_crossing = 0;
    var isNegative = false;
    for(var i = 0; i < buflen; i++){
      if(!isNegative && buf[i][channel_index]<0){
        isNegative = true;
      }
      if(buf[i][channel_index]>0 && isNegative){
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
      output_left[i] = lissa.synth.output[i][0];
      output_right[i] = lissa.synth.output[i][1];
    }
  }
  else {
    for (var i = 0; i < size; ++i) {
      output_left[i] = 0.0;
      output_right[i] = 0.0;
    }
  }
}
