class SoundAnalyzer{
    private actx: AudioContext;
    private analyzer: AnalyserNode;
    private gctx: CanvasRenderingContext2D;
    private visType: HTMLSelectElement;
    private data: Uint8Array;
    private source: AudioNode | null = null;
    private mediaSourceNode: MediaElementAudioSourceNode | null = null;

    constructor(){
        this.gctx = (<HTMLCanvasElement> document.getElementById("canvas")).getContext("2d")!;

        this.actx = new AudioContext();
        this.analyzer = this.actx.createAnalyser();
        this.analyzer.connect(this.actx.destination);
        //this.analyzer.fftSize = 1024;

        this.visType = <HTMLSelectElement> document.getElementById("types");

        // Make buffer to save data (reusable)
        this.data = new Uint8Array(this.analyzer.frequencyBinCount);
    }

    private setSource(src: AudioNode): void{
        this.source = src;
        src.connect(this.analyzer);
    }

    public setOscilatorSource(type: OscillatorType): void{
        let src = this.actx.createOscillator();
        src.type = type;
        let frequency = (<HTMLInputElement>document.getElementById("frequency"));
        frequency.addEventListener("change", () => {
            src.frequency.value = parseFloat(frequency.value);
        });
        src.frequency.value = parseFloat(frequency.value);

        //src.frequency.setValueAtTime(241, this.actx.currentTime);
        
        src.start();
        
        if(this.source){
            this.source.disconnect();
        }
        this.setSource(src);
    }

    public setMediaSource(audioElm: HTMLAudioElement){
        if(this.source){          
            this.source.disconnect();
        }

        if(!this.mediaSourceNode){
            this.mediaSourceNode = this.actx.createMediaElementSource(audioElm);
        }
        this.setSource(this.mediaSourceNode);
    }

    public setStreamMediaSource(): void{
        if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
            let promise = navigator.mediaDevices.getUserMedia({audio: true});
            promise.then((stream: MediaStream) => {
                if(this.source){
                    this.source.disconnect();
                }

                this.setSource(this.actx.createMediaStreamSource(stream));
            });
        }
    }

    public draw(): void{
        /*if(this.source instanceof OscillatorNode){
            this.source.frequency.value = Math.random() * 19980 + 20;
        }*/


        this.gctx.clearRect(0, 0, this.gctx.canvas.width, this.gctx.canvas.height);

        let midY = this.gctx.canvas.height / 2;
        this.gctx.lineWidth = 2;

        if(this.visType.value === "bar"){
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
        else{
            this.analyzer.getByteFrequencyData(this.data);
            // High frequencies are often missing
            this.drawCircle(this.data, Math.floor(this.data.length * 0.83), true);

            this.gctx.lineWidth = 4;
            this.analyzer.getByteTimeDomainData(this.data);
            this.drawCircle(this.data, this.data.length, false);
        }
    }

    drawBars(data: Uint8Array, dataLength: number, midY: number, up: boolean): void{  
        let hueStep = 360 / dataLength;  
        let hScale = this.gctx.canvas.width / dataLength;
        let vScale = this.gctx.canvas.height / dataLength;
        for(let i = 0, l = dataLength; i < l; i++){
            this.gctx.beginPath();
        
            this.gctx.strokeStyle = `hsl(${hueStep * i}, 100%, 50%)`;
            //console.log(this.gctx.strokeStyle);
            this.gctx.moveTo(i * hScale, midY);
            if(up){
                this.gctx.lineTo(i * hScale, midY - data[i] * vScale * 2);
            }
            else{
                this.gctx.lineTo(i * hScale, midY + data[i] * vScale * 2);
            }
            this.gctx.stroke();
        }
    }

    drawCircle(data: Uint8Array, dataLength: number, fill: boolean): void{
        let deltaAngle = 2 * Math.PI / (dataLength); 
        let radiusScale = Math.min(this.gctx.canvas.width, this.gctx.canvas.height) / 2 / 255;

        this.gctx.save();

        this.gctx.translate(this.gctx.canvas.width / 2, this.gctx.canvas.height / 2);
        this.gctx.beginPath();

        for(let i = 0, l = dataLength; i < l; i++){
            let x = Math.cos(i * deltaAngle) * data[i] * radiusScale;
            let y = Math.sin(i * deltaAngle) * data[i] * radiusScale;
        
            if(i === 0){
                this.gctx.moveTo(x, y);
            }
            else{
                this.gctx.lineTo(x, y);
            }
        }

        this.gctx.strokeStyle = `hsl(${Math.random() * 360}, 100%, 50%)`;

        this.gctx.closePath();

        this.gctx.stroke();

        this.gctx.restore();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    let soundAnalyzer: SoundAnalyzer;
    let audioElm = <HTMLAudioElement> document.getElementById("audio");
    let sources = <HTMLSelectElement> document.getElementById("sources");

    function play(changeSource: boolean): void{
        if(!soundAnalyzer){
            soundAnalyzer = new SoundAnalyzer();
            mainDraw();
        }

        let audio = document.getElementById("audio")!;
        let frequency = document.getElementById("frequency")!;

        audio.className = "hidden";
        frequency.className = "";
        if(sources.value === "mic"){
            soundAnalyzer.setStreamMediaSource();
            frequency.className = "hidden";
        }
        else if(sources.value === "sine"){
            soundAnalyzer.setOscilatorSource("sine");
        }
        else if(sources.value === "square"){
            soundAnalyzer.setOscilatorSource("square");
        }
        else if(sources.value === "triangle"){
            soundAnalyzer.setOscilatorSource("triangle");
        }
        else if(sources.value === "sawtooth"){
            soundAnalyzer.setOscilatorSource("sawtooth");
        }
        else{
            if(changeSource){
                audioElm.src = sources.value;
                audioElm.play();
            }
            
            soundAnalyzer.setMediaSource(audioElm);

            audio.className = "";
            frequency.className = "hidden";
        }
    }

    function mainDraw(): void{
        soundAnalyzer.draw();

        window.requestAnimationFrame(mainDraw);
    }

    audioElm.addEventListener("play", () => {
        play(false);
    });

    sources.addEventListener("change", () => {
        play(true);
    });
    
    let canvas = <HTMLCanvasElement> document.getElementById("canvas");
    function resize(): void{
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener("resize", resize);

    resize();
});