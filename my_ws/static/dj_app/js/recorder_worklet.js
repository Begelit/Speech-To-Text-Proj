import Meyda from "/dj_app/js/node_modules/meyda/dist/web/meyda.min.js";
class RecorderProcessor extends AudioWorkletProcessor{
    constructor(options) {

        super();
        
        this.sample_rate = 0;
        this.buffer_length = 0;
        this.number_of_channels = 0;
        //this.visualizer_bufferLength = 0;

        if (options && options.processorOptions) {
            const {
                numberOfChannels,
                sampleRate,
                bufferLength,
                visualizeBufferLength,
            } = options.processorOptions;
    
            this.sample_rate = sampleRate;
            this.buffer_length = bufferLength;
            this.number_of_channels = 1//numberOfChannels;
            this.visualizer_bufferLength = visualizeBufferLength;
        }
        this._recording_buffer = new Array(this.number_of_channels)
            .fill(new Float32Array(this.buffer_length));
        this.visualizer_recording_buffer = new Array(this.number_of_channels)
            .fill(new Float32Array(this.visualizer_bufferLength));
        this.mfcc_array = new Array(this.sample_rate/128)
            .fill(new Float32Array(64));
        this.current_bufferLength = 0;
        this.current_visualizer_bufferLength = 0;
        this.mfcc_bool = false;
        this.mfcc_count = 0;
        
    }

    process(inputs, outputs){
        for (let input = 0; input < 1; input++) {
            for (let channel = 0; channel < 1; channel++) {//this.number_of_channels; channel++) {
                for (let sample = 0; sample < inputs[input][channel].length; sample++) {
                    
                    const current_sample = inputs[input][channel][sample];
                    if(this.mfcc_bool === false){
                        if(Math.abs(current_sample) >= 0.3){
                            this.mfcc_bool = true;
                        }
                    }

                    if(this.mfcc_bool === true ){
                        this._recording_buffer[channel][this.current_bufferLength+sample] = current_sample;
                    } 
                    this.visualizer_recording_buffer[channel][this.current_visualizer_bufferLength+sample] = current_sample; 
                    outputs[input][channel][sample] = current_sample;
                    //current_sample = null;
                }

            }
        }
        if (this.mfcc_bool === true){
            if(this.current_bufferLength+128 < this.buffer_length){
                Meyda.bufferSize = 128;
                this.mfcc_array[this.mfcc_count] = Meyda.extract("mfcc", outputs[1][1]);
                this.current_bufferLength += 128;
                this.mfcc_count += 1;
            } else {
                this.port.postMessage({
                    message: 'MAX_BUFFER_LENGTH',
                    recording_length: this.current_bufferLength + 128,
                    buffer_array: this._recording_buffer,
                    mfcc_array: this.mfcc_array,
                });
                this.mfcc_bool = false;
                this.current_bufferLength = 0;
                this.mfcc_count = 0;
            }
        }

        /*
        this.port.postMessage({
            message: 'MAX_BUFFER_LENGTH',
            recording_length: this.current_bufferLength + 128,
            buffer_array: this._recording_buffer,

        });
        this.current_bufferLength = 0;
        this._recording_buffer = null;
        this._recording_buffer = new Array(this.number_of_channels)
                .fill(new Float32Array(this.buffer_length));
        return true;
        */

       
        if (this.current_visualizer_bufferLength + 128 < this.visualizer_bufferLength){
            this.current_visualizer_bufferLength += 128;
        } else {
            this.port.postMessage({
                message: 'MAX_VISUALIZER_BUFFER_LENGTH',
                recording_length: this.current_visualizer_bufferLength + 128,
                buffer_array: this.visualizer_recording_buffer,
            });
            this.current_visualizer_bufferLength = 0;
            this.visualizer_recording_buffer = null;
            this.visualizer_recording_buffer = new Array(this.number_of_channels)
                .fill(new Float32Array(this.visualizer_bufferLength));
        }
        
        /*
        if(this.current_bufferLength + 128 < this.buffer_length){
            this.current_bufferLength += 128;
        } else {
            this.port.postMessage({
                message: 'MAX_BUFFER_LENGTH',
                recording_length: this.current_bufferLength + 128,
                buffer_array: this._recording_buffer,

            });

            this.current_bufferLength = 0;
            //this._recording_buffer = null;
            //this._recording_buffer = new Array(this.number_of_channels)
            //    .fill(new Float32Array(this.buffer_length));
        }
        */
        return true;
        
    }
}

registerProcessor("recorder_worklet", RecorderProcessor);