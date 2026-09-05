export function createSeaAudio() {
  let context: AudioContext | undefined;
  let source: AudioBufferSourceNode | undefined;
  return {
    async setPlaying(playing: boolean) {
      if (!playing) { if(context) await context.suspend(); return; }
      if (!context) {
        context = new AudioContext();
        const buffer = context.createBuffer(1, context.sampleRate * 16, context.sampleRate);
        const channel = buffer.getChannelData(0);
        let previous = 0;
        for (let i=0;i<channel.length;i++) {
          previous=(previous+Math.random()*.045-.0225)/1.025;
          const swell=.25+.75*Math.pow(.5-.5*Math.cos(i/channel.length*Math.PI*4),2);
          channel[i]=previous*swell*2.3;
        }
        source=context.createBufferSource();source.buffer=buffer;source.loop=true;
        const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1000;
        const gain=context.createGain();gain.gain.value=.45;
        source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start();
      }
      await context.resume();
    },
    dispose() { source?.stop(); if(context) void context.close(); },
  };
}
