import React from 'react';

const WebCall: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 relative animate-in fade-in duration-500">
      <div className="text-center p-8 max-w-md">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">Web Call Agent</h2>
        <p className="text-slate-500 mb-8 text-lg">
            Experience our AI voice assistant directly in the browser. 
            Click the widget in the bottom right corner to start a conversation.
        </p>
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-left">
            <h3 className="font-bold text-slate-700 mb-2">Configuration</h3>
            <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>Mode:</span> <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">Voice</span></div>
                <div className="flex justify-between"><span>Theme:</span> <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">Dark</span></div>
                <div className="flex justify-between"><span>Assistant ID:</span> <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">73e8...4149</span></div>
            </div>
        </div>
      </div>
      
      {/* @ts-ignore */}
      <vapi-widget
        public-key="02e4643d-2cde-449b-aa39-13bd570b950a"
        assistant-id="73e8708d-d969-4b32-8690-e2b1074ba149"
        mode="voice"
        theme="dark"
        base-bg-color="#000000"
        accent-color="#14B8A6"
        cta-button-color="#000000"
        cta-button-text-color="#ffffff"
        border-radius="large"
        size="full"
        position="bottom-right"
        title="Call us"
        start-button-text="Start"
        end-button-text="End Call"
        chat-first-message="Hey, How can I help you today?"
        chat-placeholder="Type your message..."
        voice-show-transcript="true"
        consent-required="false"
      ></vapi-widget>
    </div>
  );
};

export default WebCall;
