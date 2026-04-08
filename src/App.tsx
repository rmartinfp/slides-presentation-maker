import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Entry from "./pages/Entry";
import SlideAI from "./pages/SlideAI";
import Editor from "./pages/Editor";
import TemplateStudio from "./pages/TemplateStudio";
import NotFound from "./pages/NotFound";
import Spaces from "./pages/Spaces";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Entry />} />
          <Route path="/create" element={<SlideAI />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/template-studio" element={<TemplateStudio />} />
          <Route path="/spaces" element={<Spaces />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
