import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left Pane - Brand Area */}
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-zinc-950 via-indigo-950 to-zinc-950 p-12 text-white relative overflow-hidden">
        <div className="z-10 flex items-center space-x-3 mb-12">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/20">
            S
          </div>
          <span className="text-xl font-bold tracking-tight">QueryGen AI</span>
        </div>
        
        <div className="z-10 mt-auto mb-auto max-w-md">
          <h1 className="text-4xl font-bold mb-6 tracking-tight">Turn natural language into complex SQL instantly.</h1>
          <p className="text-zinc-400 text-lg">
            Our AI-powered assistant writes, explains, and optimizes your database queries so you can focus on building.
          </p>
        </div>

        {/* Ambient Glowing Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[100px]" />
      </div>

      {/* Right Pane - Form Area */}
      <div className="flex flex-col w-full lg:w-1/2 justify-center items-center p-8 bg-zinc-900 text-foreground">
        <Outlet />
      </div>
    </div>
  );
}
