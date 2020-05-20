"use strict";
var SoundAnalyzer = /** @class */ (function () {
    function SoundAnalyzer() {
        this.source = null;
        this.mediaSourceNode = null;
        this.gctx = document.getElementById("canvas").getContext("2d");
        this.actx = new AudioContext();
        this.analyzer = this.actx.createAnalyser();
        this.analyzer.connect(this.actx.destination);
        //this.analyzer.fftSize = 1024;
        this.visType = document.getElementById("types");
        // Make buffer to save data (reusable)
        this.data = new Uint8Array(this.analyzer.frequencyBinCount);
    }
    SoundAnalyzer.prototype.setSource = function (src) {
        this.source = src;
        src.connect(this.analyzer);
    };
    SoundAnalyzer.prototype.setOscilatorSource = function (type) {
        var src = this.actx.createOscillator();
        src.type = type;
        var frequency = document.getElementById("frequency");
        frequency.addEventListener("change", function () {
            src.frequency.value = parseFloat(frequency.value);
        });
        src.frequency.value = parseFloat(frequency.value);
        //src.frequency.setValueAtTime(241, this.actx.currentTime);
        src.start();
        if (this.source) {
            this.source.disconnect();
        }
        this.setSource(src);
    };
    SoundAnalyzer.prototype.setMediaSource = function (audioElm) {
        if (this.source) {
            this.source.disconnect();
        }
        if (!this.mediaSourceNode) {
            this.mediaSourceNode = this.actx.createMediaElementSource(audioElm);
        }
        this.setSource(this.mediaSourceNode);
    };
    SoundAnalyzer.prototype.setStreamMediaSource = function () {
        var _this = this;
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            var promise = navigator.mediaDevices.getUserMedia({ audio: true });
            promise.then(function (stream) {
                if (_this.source) {
                    _this.source.disconnect();
                }
                _this.setSource(_this.actx.createMediaStreamSource(stream));
            });
        }
    };
    SoundAnalyzer.prototype.draw = function () {
        /*if(this.source instanceof OscillatorNode){
            this.source.frequency.value = Math.random() * 19980 + 20;
        }*/
        this.gctx.clearRect(0, 0, this.gctx.canvas.width, this.gctx.canvas.height);
        var midY = this.gctx.canvas.height / 2;
        this.gctx.lineWidth = 2;
        if (this.visType.value === "bar") {
            this.analyzer.getByteTimeDomainData(this.data);
            this.drawBars(this.data, this.data.length, midY, true);
            this.analyzer.getByteFrequencyData(this.data);
            // High frequencies are often missing
            this.drawBars(this.data, Math.floor(this.data.length * 0.83), midY, false);
            // Draw divider line
            this.gctx.strokeStyle = "white";
            this.gctx.beginPath();
            this.gctx.moveTo(0, midY);
            this.gctx.lineTo(this.gctx.canvas.width, midY);
            this.gctx.stroke();
        }
        else {
            this.analyzer.getByteFrequencyData(this.data);
            // High frequencies are often missing
            this.drawCircle(this.data, Math.floor(this.data.length * 0.83), true);
            this.gctx.lineWidth = 4;
            this.analyzer.getByteTimeDomainData(this.data);
            this.drawCircle(this.data, this.data.length, false);
        }
    };
    SoundAnalyzer.prototype.drawBars = function (data, dataLength, midY, up) {
        var hueStep = 360 / dataLength;
        var hScale = this.gctx.canvas.width / dataLength;
        var vScale = this.gctx.canvas.height / dataLength;
        for (var i = 0, l = dataLength; i < l; i++) {
            this.gctx.beginPath();
            this.gctx.strokeStyle = "hsl(" + hueStep * i + ", 100%, 50%)";
            //console.log(this.gctx.strokeStyle);
            this.gctx.moveTo(i * hScale, midY);
            if (up) {
                this.gctx.lineTo(i * hScale, midY - data[i] * vScale * 2);
            }
            else {
                this.gctx.lineTo(i * hScale, midY + data[i] * vScale * 2);
            }
            this.gctx.stroke();
        }
    };
    SoundAnalyzer.prototype.drawCircle = function (data, dataLength, fill) {
        var deltaAngle = 2 * Math.PI / (dataLength);
        var radiusScale = Math.min(this.gctx.canvas.width, this.gctx.canvas.height) / 2 / 255;
        this.gctx.save();
        this.gctx.translate(this.gctx.canvas.width / 2, this.gctx.canvas.height / 2);
        this.gctx.beginPath();
        for (var i = 0, l = dataLength; i < l; i++) {
            var x = Math.cos(i * deltaAngle) * data[i] * radiusScale;
            var y = Math.sin(i * deltaAngle) * data[i] * radiusScale;
            if (i === 0) {
                this.gctx.moveTo(x, y);
            }
            else {
                this.gctx.lineTo(x, y);
            }
        }
        this.gctx.strokeStyle = "hsl(" + Math.random() * 360 + ", 100%, 50%)";
        this.gctx.closePath();
        this.gctx.stroke();
        this.gctx.restore();
    };
    return SoundAnalyzer;
}());
document.addEventListener("DOMContentLoaded", function () {
    var soundAnalyzer;
    var audioElm = document.getElementById("audio");
    var sources = document.getElementById("sources");
    function play(changeSource) {
        if (!soundAnalyzer) {
            soundAnalyzer = new SoundAnalyzer();
            mainDraw();
        }
        var audio = document.getElementById("audio");
        var frequency = document.getElementById("frequency");
        audio.className = "hidden";
        frequency.className = "";
        if (sources.value === "mic") {
            soundAnalyzer.setStreamMediaSource();
            frequency.className = "hidden";
        }
        else if (sources.value === "sine") {
            soundAnalyzer.setOscilatorSource("sine");
        }
        else if (sources.value === "square") {
            soundAnalyzer.setOscilatorSource("square");
        }
        else if (sources.value === "triangle") {
            soundAnalyzer.setOscilatorSource("triangle");
        }
        else if (sources.value === "sawtooth") {
            soundAnalyzer.setOscilatorSource("sawtooth");
        }
        else {
            if (changeSource) {
                audioElm.src = sources.value;
                audioElm.play();
            }
            soundAnalyzer.setMediaSource(audioElm);
            audio.className = "";
            frequency.className = "hidden";
        }
    }
    function mainDraw() {
        soundAnalyzer.draw();
        window.requestAnimationFrame(mainDraw);
    }
    audioElm.addEventListener("play", function () {
        play(false);
    });
    sources.addEventListener("change", function () {
        play(true);
    });
    var canvas = document.getElementById("canvas");
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();
});
