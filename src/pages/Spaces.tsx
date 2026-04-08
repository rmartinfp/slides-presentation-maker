import React, { useState, useEffect } from 'react';
import { Search, Globe, FolderOpen, Sparkles, Image, Video, Mic, ChevronDown, Moon, Bell, MoreHorizontal, GraduationCap, Grid3X3, Pin, PanelLeft, Play, Zap, Maximize2, X, Upload, CheckCircle2, Eye } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   DATA — enriched template details
   ═══════════════════════════════════════════════════════════════ */

interface TemplateData {
  title: string;
  img: string;
  category: string;
  description: string;
  result: string;
  inputs: string[];
  automations: string[];
  nodes: string[];
  author?: string;
}

const GETTING_STARTED = [
  { title: 'Discover the List Node', img: '/spaces-assets/v9Bx1uTnft9Ve6yYTYPU9lZ8FUEU7LeJZOlsDn4E.jpg' },
  { title: 'Turn ideas into video', img: '/spaces-assets/zzJJ98yu0z1JAdV42orAtiqksiGMPav0VsoTMcON.jpg' },
  { title: 'Create images', img: '/spaces-assets/u9buzY40W7eh6FBPOWkgCc0fqGORmRP8w9Cja8r0.jpg' },
  { title: 'Welcome to Spaces', img: '/spaces-assets/01UurYLuFmvugBfcgnHk4A98OuWys91nVI8BpiYv.jpg' },
  { title: 'Create a Moodboard', img: '/spaces-assets/UBh25cOj6yux3qRJLTYYRgXu6Z29UgpegG5iNu6x.jpg' },
  { title: 'Explore connections', img: '/spaces-assets/VCK7OfjJhQoA9L8Ck4DWjcsCq2ISGiBMuEEmUHDb.jpg' },
];

const TEMPLATES: TemplateData[] = [
  // ── From context file (exact data) ──
  {
    title: 'Product catalog cards with Designer Node',
    img: '/spaces-assets/PH5HO4hKJ1vn1ETjUFjDTmUQ03pbrFxbRCgNY5tj.jpg',
    category: 'BRANDING',
    description: 'Create professional product catalog cards with custom branding and consistent layout across all items.',
    result: 'Professional product cards in mobile/vertical format with photo, name and details.',
    inputs: ['Photos of your products', 'Product info (name, price, description)'],
    automations: ['Generates professional design compositions', 'Applies consistent layout to all products', 'Creates cards ready for digital or print catalog'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Multiformat ad production with Designer Node',
    img: '/spaces-assets/MGPyhDmZlP9C7PglT6Nb5mE0DGfQP7siNeXk4rhA.jpg',
    category: 'ADVERTISING',
    description: 'Upload your product, write your copy, and generate a complete ad kit in multiple formats ready for campaign.',
    result: 'Ads in Story (9:16), Banner (16:9) and Post (1:1) formats.',
    inputs: ['Photo of your product', 'Ad copy text'],
    automations: ['Generates product color variations', 'Removes background for clean cutout', 'Applies designs in multiple formats', 'Delivers final campaign assets'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant', 'Upscaler'],
  },
  {
    title: 'Create poster series with Designer Node',
    img: '/spaces-assets/FCs9hBnCrz9RsFMkxQjTNVXjU97aEMQEyaYcNzut.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Generate a series of posters with coherent visual style for your brand or event.',
    result: 'Poster series with professional design and unified style.',
    inputs: ['Base image or concept', 'Text for each poster'],
    automations: ['Generates visual variations maintaining coherence', 'Applies professional typography and composition', 'Produces complete series ready to print or publish'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Transitions template',
    img: '/spaces-assets/NvnSShxIiIRz4K8XjYddNpcK5j1gKYo3i5m6Q1hh.jpg',
    category: 'SOCIAL MEDIA',
    description: 'Create transition videos with outfit and style changes for social media content.',
    result: 'Video with dynamic transitions between different looks.',
    inputs: ['Reference image', 'Desired styles/outfits'],
    automations: ['Generates consistent style variations', 'Creates fluid transitions', 'Produces viral content for social media'],
    nodes: ['Image Generator', 'Video Generator'],
    author: '@glamseasons',
  },
  {
    title: 'Scene builder from reference sheets',
    img: '/spaces-assets/JcdupfHlec1MA0sMblrVd86LXDxTffKQu7bCQWnc.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Build complete scenes from character reference sheets and environment descriptions.',
    result: 'Constructed scenes with coherent characters and backgrounds.',
    inputs: ['Character reference sheets', 'Scene description'],
    automations: ['Interprets visual references', 'Generates scenes with professional composition', 'Maintains consistency with references'],
    nodes: ['Image Generator', 'Assistant'],
    author: '@mrdavids1',
  },
  {
    title: 'High-end skin retouch & makeup',
    img: '/spaces-assets/7yvC0tX8G2ZEQ0nsJc3W8cmMBtQTT81DRFp0Lxx4.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Apply professional high-end skin retouching and digital makeup to portraits.',
    result: 'Portrait with professional skin retouching and makeup.',
    inputs: ['Portrait photo'],
    automations: ['Applies high-end skin retouching', 'Adds professional digital makeup', 'Preserves natural skin texture'],
    nodes: ['Image Generator', 'Upscaler'],
    author: '@piximperfect',
  },

  // ── Remaining templates with inferred data ──
  {
    title: 'Build your character',
    img: '/spaces-assets/K5fSl5ZOTsAf5Zh1vkkAipQ2WHehzwVgIroBvZ3I.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Design a consistent AI character with multiple poses, expressions and angles from a single description.',
    result: 'Character sheet with multiple views and expressions ready for use in projects.',
    inputs: ['Character description or reference image', 'Style preferences (anime, realistic, cartoon)'],
    automations: ['Generates consistent character across multiple poses', 'Creates front/side/back views', 'Maintains identity across all variations'],
    nodes: ['Image Generator', 'Assistant'],
  },
  {
    title: 'Product designing workflow',
    img: '/spaces-assets/9elvV7ZQgC4c2nXlbsx3P2mY6svMZ0gi9QcXyzdW.jpg',
    category: 'BRANDING',
    description: 'Go from concept to polished product design with automated iterations and mockup generation.',
    result: 'Product design mockups from multiple angles with professional presentation.',
    inputs: ['Product concept or sketch', 'Brand guidelines or color palette'],
    automations: ['Generates product design iterations', 'Creates realistic 3D-style mockups', 'Applies brand colors and styling consistently'],
    nodes: ['Image Generator', 'Assistant', 'Upscaler'],
  },
  {
    title: 'Product marketing workflow',
    img: '/spaces-assets/VxT65cc0pP2DblHiGQt7PaIrgrPkC89XSwWDTTiV.jpg',
    category: 'ADVERTISING',
    description: 'Transform product photos into a complete marketing asset kit with ads, social posts and banners.',
    result: 'Complete marketing kit: social posts, ads and banners in multiple sizes.',
    inputs: ['Product photo', 'Marketing copy and brand name'],
    automations: ['Removes and replaces product backgrounds', 'Generates marketing compositions', 'Adapts to multiple ad formats and sizes'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Digital twin',
    img: '/spaces-assets/T9usZmpxRmt102dxVWfqOCRrW9fzwc9wC6RQKDdG.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Create a digital version of yourself that can be placed in any scenario, outfit or setting.',
    result: 'Digital twin images in various scenarios and outfits.',
    inputs: ['Several reference photos of yourself', 'Desired scenarios or outfits'],
    automations: ['Learns your facial features and identity', 'Places you in different scenarios', 'Maintains likeness across all generations'],
    nodes: ['Image Generator', 'Assistant', 'Upscaler'],
  },
  {
    title: 'Create brand packaging',
    img: '/spaces-assets/vKj7Be2VXw8QybAIMRvMBMLUjAXGyEEQ0Och7CE7.jpg',
    category: 'BRANDING',
    description: 'Design professional product packaging with your brand identity applied consistently.',
    result: 'Packaging designs with mockups for boxes, bags, labels and containers.',
    inputs: ['Brand logo and colors', 'Product type and dimensions'],
    automations: ['Generates packaging design concepts', 'Applies brand identity to all formats', 'Creates realistic 3D packaging mockups'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Product shots for e-commerce',
    img: '/spaces-assets/GZWMbIxxn2QnTIlnnUTgivaDVa9ZwpVlnLbi0uFK.jpg',
    category: 'ADVERTISING',
    description: 'Turn basic product photos into professional e-commerce imagery with clean backgrounds and lifestyle scenes.',
    result: 'Professional product photos with white background and lifestyle context shots.',
    inputs: ['Raw product photo'],
    automations: ['Removes original background', 'Creates clean white-background shots', 'Generates lifestyle scene compositions', 'Upscales to high resolution'],
    nodes: ['Image Generator', 'Upscaler', 'Assistant'],
  },
  {
    title: 'Luxury jewelry campaign visuals',
    img: '/spaces-assets/TdoYU2bGjwGdmrzZhve6hTA9tjyO7zta2QkUTzFw.jpg',
    category: 'ADVERTISING',
    description: 'Create premium campaign visuals for jewelry with cinematic lighting and elegant compositions.',
    result: 'High-end jewelry campaign images with professional styling.',
    inputs: ['Jewelry product photo', 'Campaign mood or concept'],
    automations: ['Applies cinematic lighting and reflections', 'Creates luxury staging and backgrounds', 'Generates multiple campaign angles'],
    nodes: ['Image Generator', 'Upscaler', 'Assistant'],
  },
  {
    title: 'Social content studio',
    img: '/spaces-assets/GRXnox10C3ZiNhF1sSilocgpRJDX09219R7URZPP.jpg',
    category: 'SOCIAL MEDIA',
    description: 'Produce a batch of social media content from a single concept, adapted for every platform.',
    result: 'Content pack with posts, stories and banners for Instagram, TikTok and LinkedIn.',
    inputs: ['Core concept or product image', 'Brand style and copy'],
    automations: ['Generates visual variations for different platforms', 'Adapts aspect ratios automatically', 'Creates cohesive visual series'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Create social thumbnails',
    img: '/spaces-assets/UDyfgTdGXVrrFat4aikxj0btqFQ3BcbeW5pWhdOh.jpg',
    category: 'SOCIAL MEDIA',
    description: 'Generate eye-catching thumbnails for YouTube, blog posts and social media that drive clicks.',
    result: 'Thumbnails optimized for YouTube, Instagram and blog posts.',
    inputs: ['Topic or title', 'Reference image or face photo'],
    automations: ['Creates attention-grabbing compositions', 'Adds text overlays with optimal readability', 'Generates multiple style variations'],
    nodes: ['Image Generator', 'Designer Node'],
  },
  {
    title: 'Expand your character',
    img: '/spaces-assets/IdFxUNM9dcy9qM9rLYRZi3VgheGi53LPQj8RgjiZ.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Take an existing character and generate new scenes, poses and expressions maintaining consistency.',
    result: 'New character scenes and poses that match the original design.',
    inputs: ['Existing character image', 'New scene or pose descriptions'],
    automations: ['Maintains character identity across new poses', 'Generates new scenes with consistent style', 'Creates expression variations'],
    nodes: ['Image Generator', 'Assistant'],
  },
  {
    title: 'Y2k aesthetic portrait transformation',
    img: '/spaces-assets/m73yl1Tu16fDCfCe1BAQQP64wYkkkJhzDFm3y22t.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Transform portraits into Y2K aesthetic style with retro effects, colors and vibes.',
    result: 'Stylized portrait with Y2K aesthetic: metallic tones, butterfly effects, early-2000s vibes.',
    inputs: ['Portrait photo'],
    automations: ['Applies Y2K color grading and effects', 'Adds era-specific design elements', 'Preserves facial identity while transforming style'],
    nodes: ['Image Generator', 'Upscaler'],
  },
  {
    title: 'Create t-Shirt product content',
    img: '/spaces-assets/moNXnMPPEOYzr83Fjf3WOIHadBej1UjgS6JddC3S.jpg',
    category: 'ADVERTISING',
    description: 'Generate professional t-shirt mockups and product shots from your design files.',
    result: 'T-shirt mockups on models, flat lays and lifestyle shots.',
    inputs: ['T-shirt design or print graphic', 'Brand style preferences'],
    automations: ['Places design on realistic t-shirt mockups', 'Generates model wearing the product', 'Creates lifestyle and flat-lay compositions'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Design video thumbnails',
    img: '/spaces-assets/8isnijzOa6ohuAO2Bf1F0BaDAq3uT7AzwTpDKHb3.jpg',
    category: 'SOCIAL MEDIA',
    description: 'Create scroll-stopping video thumbnails with dramatic compositions and bold text.',
    result: 'Video thumbnails with expressive faces, bold titles and high contrast.',
    inputs: ['Video topic or title', 'Face photo or key frame'],
    automations: ['Creates dramatic facial expressions', 'Adds bold title text with effects', 'Optimizes composition for click-through'],
    nodes: ['Image Generator', 'Designer Node'],
  },
  {
    title: 'Render multiple views',
    img: '/spaces-assets/7cwDfy8jGqdxKjxjS9DRhpXQ48QocjHWyWoSZwdy.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Generate multiple camera angles and views of any product or object from a single image.',
    result: 'Product renders from front, side, top, 3/4 angle and detail views.',
    inputs: ['Product photo or 3D concept'],
    automations: ['Generates consistent views from multiple angles', 'Maintains material and lighting consistency', 'Creates turntable-style product views'],
    nodes: ['Image Generator', 'Camera Angles', 'Assistant'],
  },
  {
    title: 'Adapt ad for global markets',
    img: '/spaces-assets/NZpq2Bp21bsvBu9PcwxsWGign9cQm03KuMZK5mZk.jpg',
    category: 'ADVERTISING',
    description: 'Take one ad and adapt it for different markets with localized models, text and cultural context.',
    result: 'Ad variations adapted for different regional markets.',
    inputs: ['Original ad creative', 'Target markets and languages'],
    automations: ['Swaps models to match regional demographics', 'Translates and localizes copy', 'Adapts visual elements for cultural relevance'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Photoshoot to ad campaign',
    img: '/spaces-assets/4nT6XE9R7Qs505ZktRHf5rc2iBK1bWlXcQWueLKG.jpg',
    category: 'ADVERTISING',
    description: 'Transform raw photoshoot images into polished ad campaign materials across all formats.',
    result: 'Complete ad campaign set: hero images, banners, social posts.',
    inputs: ['Photoshoot images', 'Campaign brief and copy'],
    automations: ['Retouches and enhances photoshoot images', 'Creates campaign compositions and layouts', 'Adapts to all required ad formats'],
    nodes: ['Image Generator', 'Designer Node', 'Upscaler', 'Assistant'],
  },
  {
    title: 'Batch ad variation',
    img: '/spaces-assets/S0rMlp4E1aOkFbhP3MkSQqVc3TVJZ6PEF6kxcFWq.jpg',
    category: 'ADVERTISING',
    description: 'Generate dozens of ad variations from a single base creative for A/B testing at scale.',
    result: 'Multiple ad variations with different copy, colors and layouts.',
    inputs: ['Base ad creative', 'Copy variations or brand guidelines'],
    automations: ['Generates color and layout variations', 'Swaps copy across all variations', 'Produces batch-ready ad sets for testing'],
    nodes: ['Image Generator', 'Designer Node', 'List Node', 'Assistant'],
  },
  {
    title: 'Marketing campaign',
    img: '/spaces-assets/l2qMjkwcls3tgX5czE6cFzEuR5dNnr38KEXU4ETn.jpg',
    category: 'ADVERTISING',
    description: 'Build a full marketing campaign from concept to deliverables with cohesive visual identity.',
    result: 'Complete campaign kit: hero visual, social posts, email headers, banners.',
    inputs: ['Campaign concept or brief', 'Brand assets (logo, colors)'],
    automations: ['Generates hero campaign visual', 'Creates all deliverable formats', 'Maintains visual coherence across all pieces'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Multiformat social media',
    img: '/spaces-assets/nVjSrh3xQPigCy9RymGACZkKiNoYN7FYazLGXKAV.jpg',
    category: 'SOCIAL MEDIA',
    description: 'Create one post and automatically get it adapted for every social media platform.',
    result: 'Post adapted for Instagram (1:1), Story (9:16), Twitter (16:9) and LinkedIn.',
    inputs: ['Post concept or image', 'Caption and hashtags'],
    automations: ['Adapts composition to each platform ratio', 'Repositions elements for each format', 'Maintains brand consistency across all'],
    nodes: ['Image Generator', 'Designer Node'],
  },
  {
    title: 'Multiple copy variations',
    img: '/spaces-assets/0Kge4GBcvBU2kWsFAvW9K3u5XTTRSScvBi5hmOTk.jpg',
    category: 'ADVERTISING',
    description: 'Generate multiple ad copy variations on the same visual for rapid A/B testing.',
    result: 'Same ad visual with 5-10 different copy variations.',
    inputs: ['Base ad image', 'Core message or product benefits'],
    automations: ['Generates multiple headline variations', 'Places copy with optimal typography', 'Creates ready-to-test ad set'],
    nodes: ['Designer Node', 'Assistant', 'List Node'],
  },
  {
    title: 'Batch product photos',
    img: '/spaces-assets/fBZiDB5utXAwMJ10nYJdAZK6rIyHg1cof8V91ZuW.jpg',
    category: 'ADVERTISING',
    description: 'Process multiple product photos at once: remove backgrounds, enhance and place in professional scenes.',
    result: 'Batch of product photos with clean backgrounds and lifestyle contexts.',
    inputs: ['Multiple product photos'],
    automations: ['Batch-removes all backgrounds', 'Generates consistent scene compositions', 'Upscales all images to high resolution'],
    nodes: ['Image Generator', 'Upscaler', 'List Node'],
  },
  {
    title: 'Create product photoshoots',
    img: '/spaces-assets/nDnB92UHDYTNCp0xtmwWLS1SuhCqOXc5aQU2K7kf.jpg',
    category: 'ADVERTISING',
    description: 'Generate studio-quality product photoshoots without a physical studio or photographer.',
    result: 'Professional product photography with studio lighting and styled backgrounds.',
    inputs: ['Product photo (even casual/phone photo)', 'Desired mood or setting'],
    automations: ['Removes original background', 'Creates professional studio lighting', 'Generates styled compositions and props'],
    nodes: ['Image Generator', 'Upscaler', 'Assistant'],
  },
  {
    title: 'Create visuals for products',
    img: '/spaces-assets/l1wW9mA3wmsOb8RNTgAGPE7X1DF8A7p9IbNrpMmX.jpg',
    category: 'BRANDING',
    description: 'Generate beautiful product visuals for websites, pitch decks and marketing materials.',
    result: 'Polished product visuals with lifestyle context and professional presentation.',
    inputs: ['Product photo or description', 'Visual style preferences'],
    automations: ['Creates hero product images', 'Generates contextual lifestyle shots', 'Produces presentation-ready visuals'],
    nodes: ['Image Generator', 'Upscaler', 'Assistant'],
  },
  {
    title: 'Dynamic angles',
    img: '/spaces-assets/S6z90KmCHH7J8uWVRpmywG991xG5lnHxWNm84q5v.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Generate dramatic camera angles and perspectives from a single flat image.',
    result: 'Same subject from multiple dynamic perspectives: low angle, bird eye, dutch tilt.',
    inputs: ['Source image'],
    automations: ['Generates multiple camera angle variations', 'Maintains subject consistency', 'Creates cinematic perspective effects'],
    nodes: ['Image Generator', 'Camera Angles'],
  },
  {
    title: 'Character sheet',
    img: '/spaces-assets/TCuGEti0eO3o7GGKEw0skk4QHB83N4IQsXkx9Zqw.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Generate a complete character reference sheet with turnaround views, expressions and details.',
    result: 'Character turnaround sheet: front, side, back, plus expression studies.',
    inputs: ['Character description or concept art', 'Style guide (anime, realistic, etc.)'],
    automations: ['Generates consistent character turnaround', 'Creates expression sheet', 'Maintains proportions and style across all views'],
    nodes: ['Image Generator', 'Assistant'],
  },
  {
    title: 'Try new materials',
    img: '/spaces-assets/5Ly2HIyIribW8CPqJRdOEWXLItossnybtw5bQCl5.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Visualize your product design in different materials: wood, metal, fabric, glass and more.',
    result: 'Same product rendered in 5+ different material finishes.',
    inputs: ['Product image', 'Materials to try (or let AI suggest)'],
    automations: ['Applies realistic material textures', 'Adjusts lighting for each material', 'Maintains product shape and proportions'],
    nodes: ['Image Generator', 'Assistant'],
  },
  {
    title: 'Design full brand book',
    img: '/spaces-assets/jxoyebAebd5KaTpvAnaumSx50GImjSljxZDNSzgw.jpg',
    category: 'BRANDING',
    description: 'Generate a complete brand identity book with logo applications, color palettes, typography and mockups.',
    result: 'Brand book pages: logo usage, color palette, typography, stationery mockups.',
    inputs: ['Brand name and logo', 'Brand values and personality'],
    automations: ['Generates color palette and typography pairings', 'Creates logo application examples', 'Produces stationery and digital mockups'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Create stationery brand identity',
    img: '/spaces-assets/67Py1gbk5Tvuqx0ocL7hfkmgbzpZDmxJQLB0E7qP.jpg',
    category: 'BRANDING',
    description: 'Design a cohesive stationery set: business cards, letterhead, envelopes and more.',
    result: 'Complete stationery set with consistent brand identity.',
    inputs: ['Brand logo and colors', 'Contact information'],
    automations: ['Designs business card layouts', 'Creates letterhead and envelope designs', 'Generates realistic printed mockups'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Visualize outfit across scenarios',
    img: '/spaces-assets/gXuAQcGd64KJ2UGJSjENkYkWcbSlZlGZWInf2PTZ.jpg',
    category: 'SOCIAL MEDIA',
    description: 'See how an outfit looks in different scenarios: street, office, beach, night out.',
    result: 'Same person wearing the outfit in 4+ different lifestyle scenarios.',
    inputs: ['Photo wearing the outfit', 'Desired scenarios'],
    automations: ['Maintains outfit and person identity', 'Places in realistic lifestyle scenarios', 'Adjusts lighting and ambiance per scene'],
    nodes: ['Image Generator', 'Assistant'],
  },
  {
    title: 'Generate product showcase video',
    img: '/spaces-assets/tmU56j8f06POpO1SUqCGPwRy4edYXzIBD6S6OIhw.jpg',
    category: 'ADVERTISING',
    description: 'Turn a single product photo into a cinematic showcase video with motion and transitions.',
    result: 'Short product video with cinematic camera movements and transitions.',
    inputs: ['Product photo', 'Video style or mood'],
    automations: ['Animates product with cinematic camera moves', 'Adds smooth transitions and effects', 'Produces ready-to-publish video'],
    nodes: ['Image Generator', 'Video Generator', 'Assistant'],
  },
  {
    title: 'Animate a snapshot',
    img: '/spaces-assets/bQzIjq49CCyWOKAQfgEexaXjKu1NvJpb8r9R0Nzk.jpg',
    category: 'FILMMAKING',
    description: 'Bring a still photo to life with subtle motion: hair blowing, water flowing, clouds moving.',
    result: 'Animated video clip from your still photo with natural motion.',
    inputs: ['Still photo to animate'],
    automations: ['Detects elements that should move', 'Applies natural motion animation', 'Creates seamless looping video'],
    nodes: ['Image Generator', 'Video Generator'],
  },
  {
    title: 'Transform rooms into designs',
    img: '/spaces-assets/GbO63mZVRi9ahKy96k3W972e1HgQd8Ka5YKG72nd.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Redesign any room by uploading a photo and choosing a new interior design style.',
    result: 'Room redesigned in your chosen style: modern, minimalist, bohemian, industrial.',
    inputs: ['Room photo', 'Desired interior style'],
    automations: ['Analyzes room structure and layout', 'Applies new design style while keeping room shape', 'Generates photorealistic interior renders'],
    nodes: ['Image Generator', 'Assistant'],
  },
  {
    title: 'Design Instagram reel cover',
    img: '/spaces-assets/cFQzxiATeg49hrx5c3yEiGtoNqzYyeCZqhRabApI.jpg',
    category: 'SOCIAL MEDIA',
    description: 'Create eye-catching Instagram Reel covers that match your brand aesthetic and drive views.',
    result: 'Instagram Reel cover images optimized for your brand grid.',
    inputs: ['Reel topic or key frame', 'Brand colors and style'],
    automations: ['Creates on-brand cover compositions', 'Adds title text with optimal placement', 'Matches your existing Instagram grid aesthetic'],
    nodes: ['Image Generator', 'Designer Node'],
  },
  {
    title: 'Customize designs for social media',
    img: '/spaces-assets/gkIyijY1ZNm6vkkr2Ixi3ulQANI00wH6dHIZlYui.jpg',
    category: 'SOCIAL MEDIA',
    description: 'Take a base design and generate customized variations for all social media platforms.',
    result: 'Customized design set for Instagram, Facebook, Twitter, LinkedIn and TikTok.',
    inputs: ['Base design or concept', 'Platform requirements'],
    automations: ['Adapts design to each platform specs', 'Generates text and element variations', 'Ensures brand consistency across all'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Create consistent sequential scenes',
    img: '/spaces-assets/2y7xewrqa7s7n1wgmEd6Qprw0XwU5hA5h0Hw3nTQ.jpg',
    category: 'FILMMAKING',
    description: 'Generate a sequence of scenes with consistent characters, style and narrative progression.',
    result: 'Storyboard-style scene sequence with consistent characters and environments.',
    inputs: ['Character description or reference', 'Scene sequence descriptions'],
    automations: ['Maintains character identity across all scenes', 'Creates progressive narrative visuals', 'Ensures consistent lighting and style'],
    nodes: ['Image Generator', 'Assistant'],
  },
  {
    title: 'Generate hyperlapse',
    img: '/spaces-assets/asJaclvn32t7XwTLSfj1Rns58LumNeydSgRYHPEW.jpg',
    category: 'FILMMAKING',
    description: 'Create stunning hyperlapse-style videos from a single image or concept.',
    result: 'Hyperlapse video with smooth camera movement through a scene.',
    inputs: ['Scene image or description'],
    automations: ['Generates extended scene from single image', 'Creates smooth camera path animation', 'Produces cinematic hyperlapse effect'],
    nodes: ['Image Generator', 'Video Generator'],
  },
  {
    title: 'Create storyboard from image',
    img: '/spaces-assets/biSejsPF2HU2h5Isz1BnifuVwsANuDUszEXKvJ2v.jpg',
    category: 'FILMMAKING',
    description: 'Turn a single key image into a full storyboard with multiple shots and camera directions.',
    result: 'Complete storyboard with 6-12 panels showing different shots and angles.',
    inputs: ['Key image or scene description', 'Story direction or mood'],
    automations: ['Breaks scene into multiple shot compositions', 'Generates diverse camera angles', 'Creates professional storyboard layout'],
    nodes: ['Image Generator', 'Camera Angles', 'Assistant'],
  },
  {
    title: 'Create sport brand visuals',
    img: '/spaces-assets/p1oJn6FB13ICx3o1nycoutQovEf3k3KRqcfNqHhH.jpg',
    category: 'BRANDING',
    description: 'Generate dynamic sports brand visuals with action shots, product displays and campaign materials.',
    result: 'Sports brand visual kit: action shots, product features, campaign banners.',
    inputs: ['Sports product images', 'Brand identity and target sport'],
    automations: ['Generates dynamic action compositions', 'Creates product-focused hero shots', 'Produces campaign-ready brand visuals'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
  {
    title: 'Generate a professional headshot',
    img: '/spaces-assets/gTYzLez8E07QpcJTamss2BYvCB8Q8GjRcd5cezHC.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Transform a casual selfie into a professional corporate headshot with studio lighting.',
    result: 'Professional headshot with clean background and studio-quality lighting.',
    inputs: ['Casual photo of yourself'],
    automations: ['Enhances lighting to studio quality', 'Cleans background to professional neutral', 'Applies subtle retouching while keeping natural look'],
    nodes: ['Image Generator', 'Upscaler'],
  },
  {
    title: 'Create winter visuals',
    img: '/spaces-assets/tYbraWy1yiE6ia1wgawXpMwnB3YIvMCVWFaXIS4t.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Generate cozy winter-themed visuals for seasonal campaigns, social media and branding.',
    result: 'Winter-themed visual set with snow, warm lighting and seasonal atmosphere.',
    inputs: ['Product or concept to winterize', 'Mood preferences (cozy, dramatic, festive)'],
    automations: ['Applies winter atmosphere and snow effects', 'Creates seasonal color grading', 'Generates multiple winter scene variations'],
    nodes: ['Image Generator', 'Assistant'],
  },
  {
    title: 'Sketch to product render',
    img: '/spaces-assets/dxsGK8EKyG7ou7gpcLnhF04mQikw80m8aS5DFrwU.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Turn rough product sketches into photorealistic 3D-style renders.',
    result: 'Photorealistic product render from your sketch with materials and lighting.',
    inputs: ['Product sketch or drawing', 'Material and finish preferences'],
    automations: ['Interprets sketch proportions and form', 'Applies realistic materials and textures', 'Generates photorealistic lighting and renders'],
    nodes: ['Image Generator', 'Upscaler', 'Assistant'],
  },
  {
    title: 'Modify facial expressions',
    img: '/spaces-assets/Sggu7Vg7G5x9LmUzknsVcpXETKtXLA1tlyvlPqjP.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Change the facial expression in a portrait while maintaining the person identity and photo quality.',
    result: 'Same portrait with different expressions: smile, serious, surprised, thoughtful.',
    inputs: ['Portrait photo'],
    automations: ['Detects facial features accurately', 'Modifies expression while preserving identity', 'Maintains photo quality and lighting'],
    nodes: ['Image Generator', 'Assistant'],
  },
  {
    title: 'Turn casual photos into studio shots',
    img: '/spaces-assets/hFruPYYT8rn7R0yX9X1Um0xrYHNuwKZqaV8YIDwp.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Upgrade casual phone photos into professional studio-quality shots with perfect lighting.',
    result: 'Studio-quality photos with professional lighting, background and retouching.',
    inputs: ['Casual photo (phone quality is fine)'],
    automations: ['Enhances lighting to studio standard', 'Replaces background with professional setting', 'Applies professional color grading and retouching'],
    nodes: ['Image Generator', 'Upscaler'],
  },
  {
    title: 'Prototyping Moodboard Product',
    img: '/spaces-assets/ahxSizRniQkUOnFKb491O6gWENQMVdE0IKVwfRiC.jpg',
    category: 'BRANDING',
    description: 'Create a visual moodboard for product prototyping with materials, textures and design references.',
    result: 'Product moodboard with material swatches, color palette and design direction.',
    inputs: ['Product concept or brief', 'Inspiration references or keywords'],
    automations: ['Curates relevant visual references', 'Generates material and texture samples', 'Creates organized moodboard layout'],
    nodes: ['Image Generator', 'Assistant'],
  },
  {
    title: 'Restore your memories',
    img: '/spaces-assets/ppdOXKK1kSKIgdu6G5nILgGZ7KJMoCjpTOuFCGvv.jpg',
    category: 'CREATIVE PRODUCTION',
    description: 'Restore and enhance old, damaged or low-quality family photos to vivid high resolution.',
    result: 'Restored photos with enhanced clarity, repaired damage and vivid colors.',
    inputs: ['Old or damaged photo'],
    automations: ['Repairs scratches, tears and fading', 'Enhances resolution and sharpness', 'Restores natural colors and detail'],
    nodes: ['Image Generator', 'Upscaler'],
  },
  {
    title: 'Brand identity',
    img: '/spaces-assets/DfcCKtPZy9gNyqNUjmTAZ4f5LESJCfH0aziMqLvn.jpg',
    category: 'BRANDING',
    description: 'Generate a complete brand identity system with logo concepts, colors, typography and applications.',
    result: 'Brand identity package: logo options, color system, typography, mockups.',
    inputs: ['Brand name and industry', 'Brand personality keywords'],
    automations: ['Generates logo concept explorations', 'Creates complementary color palettes', 'Produces typography pairings and mockups'],
    nodes: ['Image Generator', 'Designer Node', 'Assistant'],
  },
];

const SIDEBAR_TOOLS = [
  { icon: Sparkles, label: 'Assistant' },
  { icon: Image, label: 'Image Generator' },
  { icon: Video, label: 'Video Generator' },
  { icon: Zap, label: 'Spaces', active: true },
  { icon: Mic, label: 'Voice Generator' },
  { icon: Maximize2, label: 'Image Upscaler' },
  { icon: Play, label: 'Video Project Editor' },
  { icon: Maximize2, label: 'Video Upscaler' },
];

/* node colors for pills */
const NODE_COLORS: Record<string, string> = {
  'Image Generator': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
  'Video Generator': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'Designer Node': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Assistant': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Upscaler': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  'Voiceover': 'bg-rose-500/15 text-rose-300 border-rose-500/20',
  'Sound Effects': 'bg-orange-500/15 text-orange-300 border-orange-500/20',
  'Music Generator': 'bg-pink-500/15 text-pink-300 border-pink-500/20',
  'Camera Angles': 'bg-sky-500/15 text-sky-300 border-sky-500/20',
  'List Node': 'bg-teal-500/15 text-teal-300 border-teal-500/20',
};

const NODE_ICONS: Record<string, any> = {
  'Image Generator': Image,
  'Video Generator': Video,
  'Designer Node': Grid3X3,
  'Assistant': Sparkles,
  'Upscaler': Maximize2,
  'Voiceover': Mic,
  'Camera Angles': Eye,
  'List Node': Grid3X3,
};

/* category badge colors */
const CATEGORY_COLORS: Record<string, string> = {
  'BRANDING': 'text-amber-400',
  'ADVERTISING': 'text-rose-400',
  'SOCIAL MEDIA': 'text-sky-400',
  'CREATIVE PRODUCTION': 'text-emerald-400',
  'FILMMAKING': 'text-purple-400',
};

/* ═══════════════════════════════════════════════════════════════
   LOGO
   ═══════════════════════════════════════════════════════════════ */

function SpacesLogo({ className }: { className?: string }) {
  return (
    <svg className={className} width="495" height="140" viewBox="0 0 495 140" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M39.6 108C31 108 23.4 106.3 16.8 102.9C10.3 99.5 4.7 94.4 0 87.6L11.1 74.85C16 81.85 20.7 86.7 25.2 89.4C29.7 92.1 35.05 93.45 41.25 93.45C45.05 93.45 48.5 92.85 51.6 91.65C54.7 90.45 57.15 88.8 58.95 86.7C60.75 84.6 61.65 82.2 61.65 79.5C61.65 77.7 61.35 76 60.75 74.4C60.15 72.8 59.2 71.35 57.9 70.05C56.7 68.75 55.1 67.55 53.1 66.45C51.2 65.35 48.95 64.4 46.35 63.6C43.75 62.7 40.75 61.95 37.35 61.35C31.95 60.25 27.25 58.8 23.25 57C19.25 55.2 15.9 52.95 13.2 50.25C10.5 47.55 8.5 44.5 7.2 41.1C5.9 37.6 5.25 33.7 5.25 29.4C5.25 23.7 6.85 18.65 10.05 14.25C13.25 9.85 17.55 6.4 22.95 3.9C28.45 1.3 34.6 0 41.4 0C49.5 0 56.55 1.6 62.55 4.8C68.65 7.9 73.45 12.45 76.95 18.45L65.55 29.7C62.55 24.8 58.95 21.05 54.75 18.45C50.65 15.85 46.05 14.55 40.95 14.55C37.05 14.55 33.65 15.15 30.75 16.35C27.85 17.55 25.55 19.25 23.85 21.45C22.25 23.55 21.45 26.05 21.45 28.95C21.45 31.05 21.85 33 22.65 34.8C23.45 36.5 24.65 38.05 26.25 39.45C27.95 40.75 30.2 41.95 33 43.05C35.8 44.05 39.15 44.95 43.05 45.75C48.55 46.95 53.45 48.5 57.75 50.4C62.05 52.2 65.7 54.35 68.7 56.85C71.7 59.35 73.95 62.15 75.45 65.25C77.05 68.35 77.85 71.7 77.85 75.3C77.85 82 76.3 87.8 73.2 92.7C70.1 97.6 65.7 101.4 60 104.1C54.3 106.7 47.5 108 39.6 108Z" />
      <path d="M96.9 139.5V27.75H112.5V45.75L110.1 44.4C110.7 41.4 112.4 38.55 115.2 35.85C118 33.05 121.4 30.8 125.4 29.1C129.5 27.3 133.7 26.4 138 26.4C145.1 26.4 151.4 28.15 156.9 31.65C162.4 35.15 166.75 39.95 169.95 46.05C173.15 52.15 174.75 59.15 174.75 67.05C174.75 74.85 173.15 81.85 169.95 88.05C166.85 94.15 162.55 99 157.05 102.6C151.55 106.1 145.35 107.85 138.45 107.85C133.85 107.85 129.4 106.95 125.1 105.15C120.8 103.25 117.15 100.85 114.15 97.95C111.15 95.05 109.3 92.05 108.6 88.95L112.5 86.85V139.5H96.9ZM135.9 93.6C140.5 93.6 144.6 92.45 148.2 90.15C151.8 87.85 154.65 84.7 156.75 80.7C158.85 76.7 159.9 72.15 159.9 67.05C159.9 61.95 158.85 57.45 156.75 53.55C154.75 49.55 151.95 46.4 148.35 44.1C144.75 41.8 140.6 40.65 135.9 40.65C131.2 40.65 127.05 41.8 123.45 44.1C119.85 46.3 117 49.4 114.9 53.4C112.8 57.4 111.75 61.95 111.75 67.05C111.75 72.15 112.8 76.7 114.9 80.7C117 84.7 119.85 87.85 123.45 90.15C127.05 92.45 131.2 93.6 135.9 93.6Z" />
      <path d="M238.18 106.5V55.2C238.18 50.8 236.58 47.25 233.38 44.55C230.28 41.75 226.33 40.35 221.53 40.35C217.13 40.35 213.13 41.25 209.53 43.05C206.03 44.85 202.83 47.6 199.93 51.3L189.88 41.25C194.58 36.15 199.63 32.35 205.03 29.85C210.53 27.35 216.43 26.1 222.73 26.1C228.73 26.1 233.93 27.1 238.33 29.1C242.73 31.1 246.13 34.05 248.53 37.95C250.93 41.75 252.13 46.4 252.13 51.9V106.5H238.18ZM214.63 108C209.53 108 204.98 107 200.98 105C196.98 103 193.78 100.25 191.38 96.75C189.08 93.15 187.93 88.95 187.93 84.15C187.93 79.55 189.03 75.45 191.23 71.85C193.43 68.25 196.68 65.35 200.98 63.15C205.38 60.95 210.73 59.85 217.03 59.85H240.58V71.1H218.23C213.23 71.1 209.58 72.2 207.28 74.4C205.08 76.6 203.98 79.35 203.98 82.65C203.98 86.25 205.28 89.2 207.88 91.5C210.48 93.7 214.08 94.8 218.68 94.8C222.88 94.8 226.58 93.8 229.78 91.8C232.98 89.7 235.48 86.65 237.28 82.65L239.98 93C237.88 97.8 234.68 101.55 230.38 104.25C226.18 106.75 221 108 214.63 108Z" />
      <path d="M300.65 108C293.15 108 286.45 106.2 280.55 102.6C274.75 98.9 270.15 94 266.75 87.9C263.45 81.7 261.8 74.7 261.8 66.9C261.8 59.1 263.45 52.15 266.75 46.05C270.05 39.95 274.55 35.15 280.25 31.65C286.05 28.15 292.55 26.4 299.75 26.4C306.35 26.4 311.95 27.65 316.55 30.15C321.25 32.55 324.75 35.45 327.05 38.85C329.35 42.25 330.65 45.3 330.95 48L327.35 46.2V27.75H342.95V106.5H327.35V87.9L331.25 86.1C330.65 89.2 328.85 92.55 325.85 96.15C322.95 99.65 319.15 102.55 314.45 104.85C309.75 107.15 304.55 108.3 298.85 108.3L300.65 108ZM302.15 93.6C306.85 93.6 311.05 92.45 314.75 90.15C318.45 87.85 321.35 84.7 323.45 80.7C325.55 76.7 326.6 72.15 326.6 67.05C326.6 61.95 325.55 57.45 323.45 53.55C321.35 49.55 318.45 46.4 314.75 44.1C311.05 41.8 306.85 40.65 302.15 40.65C297.45 40.65 293.25 41.8 289.55 44.1C285.95 46.4 283.1 49.55 281 53.55C278.9 57.45 277.85 61.95 277.85 67.05C277.85 72.15 278.9 76.7 281 80.7C283.1 84.7 285.95 87.85 289.55 90.15C293.25 92.45 297.45 93.6 302.15 93.6Z" />
      <path d="M387.2 108C379.3 108 372.2 106.2 365.9 102.6C359.7 99 354.8 94.1 351.2 87.9C347.6 81.7 345.8 74.7 345.8 66.9C345.8 59.1 347.55 52.15 351.05 46.05C354.55 39.95 359.35 35.15 365.45 31.65C371.65 28.15 378.6 26.4 386.3 26.4C393.5 26.4 399.95 28 405.65 31.2C411.45 34.3 415.95 38.75 419.15 44.55C422.45 50.35 424.1 57.15 424.1 64.95C424.1 66.05 424.05 67.2 423.95 68.4C423.85 69.5 423.7 70.65 423.5 71.85H358.7V59.4H414.5L407.3 63C407.3 58.4 406.35 54.25 404.45 50.55C402.55 46.85 399.85 43.9 396.35 41.7C392.95 39.5 389 38.4 384.5 38.4C380 38.4 375.95 39.5 372.35 41.7C368.85 43.9 366.05 46.9 363.95 50.7C361.95 54.4 360.95 58.75 360.95 63.75V68.25C360.95 73.55 362.05 78.2 364.25 82.2C366.55 86.2 369.65 89.3 373.55 91.5C377.55 93.6 382.05 94.65 387.05 94.65C391.55 94.65 395.55 93.85 399.05 92.25C402.55 90.55 405.65 88.05 408.35 84.75L417.65 94.05C414.25 98.35 409.85 101.7 404.45 104.1C399.15 106.4 393.35 107.55 387.05 107.55L387.2 108Z" />
      <path d="M451 108C445.7 108 440.65 107.35 435.85 106.05C431.15 104.75 427.05 102.75 423.55 100.05L430.15 88.65C433.35 91.05 436.8 92.85 440.5 94.05C444.3 95.25 448.15 95.85 452.05 95.85C457.25 95.85 461.15 95.05 463.75 93.45C466.35 91.75 467.65 89.5 467.65 86.7C467.65 84.5 466.85 82.8 465.25 81.6C463.65 80.3 461.55 79.35 458.95 78.75C456.45 78.05 453.55 77.45 450.25 76.95C446.95 76.45 443.65 75.75 440.35 74.85C437.05 73.85 434.05 72.5 431.35 70.8C428.75 69.1 426.65 66.85 425.05 64.05C423.45 61.25 422.65 57.7 422.65 53.4C422.65 48.5 423.95 44.15 426.55 40.35C429.25 36.45 432.9 33.4 437.5 31.2C442.2 28.9 447.6 27.75 453.7 27.75C458.3 27.75 462.85 28.35 467.35 29.55C471.85 30.75 475.7 32.55 478.9 34.95L472.3 46.2C469.1 43.8 465.8 42.1 462.4 41.1C459.1 40.1 455.95 39.6 452.95 39.6C448.05 39.6 444.25 40.5 441.55 42.3C438.95 44.1 437.65 46.4 437.65 49.2C437.65 51.5 438.4 53.3 439.9 54.6C441.5 55.9 443.6 56.9 446.2 57.6C448.8 58.3 451.7 58.95 454.9 59.55C458.2 60.05 461.5 60.75 464.8 61.65C468.1 62.55 471.05 63.85 473.65 65.55C476.35 67.15 478.5 69.35 480.1 72.15C481.7 74.85 482.5 78.3 482.5 82.5C482.5 87.4 481.1 91.8 478.3 95.7C475.5 99.5 471.65 102.5 466.75 104.7C461.85 106.9 456.15 108 449.65 108H451Z" />
    </svg>
  );
}

function FreepikLogo() {
  return (
    <svg className="w-6 h-6 fill-current text-[#e8e8e8]" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TEMPLATE DETAIL MODAL
   ═══════════════════════════════════════════════════════════════ */

function TemplateDetailModal({ template, onClose }: { template: TemplateData; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const catColor = CATEGORY_COLORS[template.category] || 'text-[#737373]';

  const inputIcon = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('photo') || t.includes('image') || t.includes('picture') || t.includes('portrait') || t.includes('sketch') || t.includes('selfie') || t.includes('reference') || t.includes('sheet'))
      return <Image className="w-6 h-6" strokeWidth={1.5} />;
    if (t.includes('video') || t.includes('frame'))
      return <Video className="w-6 h-6" strokeWidth={1.5} />;
    return <Upload className="w-6 h-6" strokeWidth={1.5} />;
  };

  /* layout math for SVG curves */
  const inputCount = template.inputs.length;
  const autoCount = template.automations.length;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-[1320px] mx-6 my-10 rounded-[28px] bg-[#111] border border-white/[0.07] overflow-hidden shadow-2xl">
        {/* close */}
        <button onClick={onClose} className="absolute top-6 right-6 z-20 flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
          <X className="w-4.5 h-4.5 text-[#888]" />
        </button>

        {/* ── Header ── */}
        <div className="px-14 pt-12 pb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-[11px] font-bold tracking-[0.14em] uppercase ${catColor}`}>{template.category}</span>
            {template.author && (
              <span className="text-[11px] text-[#555] bg-white/[0.04] px-3 py-1 rounded-full">
                by <span className="text-[#999]">{template.author}</span>
              </span>
            )}
          </div>
          <h1 className="text-[#f0f0f0] text-[32px] font-bold leading-[1.15] pr-16 max-w-[800px]">{template.title}</h1>
          <p className="text-[#555] text-base mt-3 max-w-[640px] leading-relaxed">{template.description}</p>
        </div>

        {/* ══════════════════════════════════════════════════
            CANVAS: YOU PROVIDE → WORKFLOW DOES → YOU GET
           ══════════════════════════════════════════════════ */}
        <div className="relative bg-[#0a0a0a] border-y border-white/[0.05] overflow-hidden">
          {/* dot grid background */}
          <div className="absolute inset-0 opacity-[0.035]" style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />

          {/* SVG bezier connectors */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]" viewBox="0 0 1000 420" preserveAspectRatio="none">
            {/* Left connectors: inputs → center automations */}
            {template.inputs.map((_, i) => {
              const startX = 210;
              const startY = inputCount === 1 ? 210 : 130 + i * (160 / Math.max(inputCount - 1, 1));
              const endX = 370;
              const endY = autoCount <= 1 ? 210 : 100 + (i % autoCount) * (220 / Math.max(autoCount - 1, 1));
              const cpx1 = startX + 70;
              const cpx2 = endX - 70;
              return (
                <path key={`l${i}`}
                  d={`M ${startX} ${startY} C ${cpx1} ${startY}, ${cpx2} ${endY}, ${endX} ${endY}`}
                  stroke="rgba(201,162,39,0.3)" strokeWidth="2" fill="none" strokeLinecap="round"
                />
              );
            })}
            {/* Right connectors: center automations → output */}
            {template.automations.map((_, i) => {
              const startX = 640;
              const startY = autoCount <= 1 ? 210 : 100 + i * (220 / Math.max(autoCount - 1, 1));
              const endX = 790;
              const endY = 210;
              const cpx1 = startX + 70;
              const cpx2 = endX - 70;
              return (
                <path key={`r${i}`}
                  d={`M ${startX} ${startY} C ${cpx1} ${startY}, ${cpx2} ${endY}, ${endX} ${endY}`}
                  stroke="rgba(52,211,153,0.3)" strokeWidth="2" fill="none" strokeLinecap="round"
                />
              );
            })}
          </svg>

          <div className="relative z-[2] grid grid-cols-[260px_1fr_300px] min-h-[420px]">

            {/* ── LEFT: You provide ── */}
            <div className="p-10 pr-4 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-[#c9a227]" />
                <span className="text-[#c9a227] text-[11px] font-bold uppercase tracking-[0.12em]">You provide</span>
              </div>
              <div className="flex flex-col gap-5">
                {template.inputs.map((input, i) => (
                  <div key={i} className="relative flex items-center gap-4 rounded-2xl bg-[#141414] border border-[#c9a227]/20 px-5 py-5">
                    {/* port right */}
                    <div className="absolute -right-[7px] top-1/2 -translate-y-1/2 w-[13px] h-[13px] rounded-full border-2 border-[#c9a227]/40 bg-[#0a0a0a]" />
                    <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] border border-[#c9a227]/10 flex items-center justify-center text-[#c9a227]/40 flex-shrink-0">
                      {inputIcon(input)}
                    </div>
                    <p className="text-[#bbb] text-[14px] leading-snug min-w-0">{input}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CENTER: The workflow does for you ── */}
            <div className="py-10 px-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-6 justify-center">
                <Zap className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2.5} />
                <span className="text-[#666] text-[11px] font-bold uppercase tracking-[0.12em]">The workflow does</span>
              </div>
              <div className="flex flex-col gap-4 max-w-[380px] mx-auto">
                {template.automations.map((auto, i) => (
                  <div key={i} className="relative flex items-center gap-3.5 rounded-2xl bg-[#141414] border border-white/[0.06] px-5 py-4">
                    {/* port left */}
                    <div className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-[13px] h-[13px] rounded-full border-2 border-[#333] bg-[#0a0a0a]" />
                    {/* port right */}
                    <div className="absolute -right-[7px] top-1/2 -translate-y-1/2 w-[13px] h-[13px] rounded-full border-2 border-[#333] bg-[#0a0a0a]" />
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400/60" strokeWidth={2} />
                    </div>
                    <p className="text-[#999] text-[13px] leading-snug min-w-0">{auto}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: You get ── */}
            <div className="p-10 pl-4 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 text-[11px] font-bold uppercase tracking-[0.12em]">You get</span>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20">
                {/* port left */}
                <div className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-[13px] h-[13px] rounded-full border-2 border-emerald-500/40 bg-[#0a0a0a] z-10" />
                <img src={template.img} alt={template.title} className="w-full aspect-[4/3] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-white/90 text-[13px] font-medium leading-relaxed">{template.result}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer: Nodes + CTAs ── */}
        <div className="px-14 py-8 flex items-center justify-between gap-8">
          {/* Node pills */}
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <span className="text-[11px] font-bold text-[#444] uppercase tracking-[0.1em] mr-1">Nodes</span>
            {template.nodes.map((node) => {
              const colorClass = NODE_COLORS[node] || 'bg-white/[0.06] text-[#b4b4b4] border-white/[0.08]';
              const IconComp = NODE_ICONS[node];
              return (
                <span key={node} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium ${colorClass}`}>
                  {IconComp && <IconComp className="w-3.5 h-3.5" strokeWidth={2} />}
                  {node}
                </span>
              );
            })}
          </div>
          {/* CTAs */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button className="h-12 px-7 rounded-xl border border-white/[0.1] bg-transparent hover:bg-white/[0.04] text-[#aaa] text-sm font-medium transition-colors flex items-center gap-2.5">
              <Eye className="w-4 h-4" strokeWidth={2} />
              Preview workflow
            </button>
            <button className="h-14 px-12 rounded-2xl bg-[#336aea] hover:bg-[#2955bb] text-white text-base font-semibold transition-all flex items-center gap-3 shadow-lg shadow-[#336aea]/25 hover:shadow-[#336aea]/40">
              <Sparkles className="w-5 h-5" strokeWidth={2} />
              Use template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function SidebarItem({ icon: Icon, label, active = false }: { icon: any; label: string; active?: boolean }) {
  return (
    <button className={`group/item flex w-full items-center gap-2 rounded-lg px-[9px] h-8 text-xs transition-colors duration-150 ${active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.06]'}`}>
      <span className="flex shrink-0 items-center justify-center w-3.5 h-3.5">
        <Icon className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
      </span>
      <span className="text-[#b4b4b4] truncate whitespace-nowrap">{label}</span>
      <span className="ml-auto flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
        <Pin className="w-3.5 h-3.5 text-[#737373]" strokeWidth={1.5} />
      </span>
    </button>
  );
}

function GettingStartedCard({ title, img }: { title: string; img: string }) {
  return (
    <div className="flex-shrink-0 group relative cursor-pointer transition-all duration-200" style={{ width: 340 }}>
      <div className="relative w-full transition-transform duration-200">
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-2xl">
          <img src={img} alt={title} className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl transition-transform duration-300 group-hover:scale-150" />
          <div className="absolute inset-0 bg-[#0f0f0f]/70" />
          <div className="relative z-10 flex h-full">
            <div className="aspect-square h-full flex-shrink-0 overflow-hidden">
              <img src={img} alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="flex flex-1 items-center px-3 md:px-4 lg:px-6">
              <h2 className="text-[#b4b4b4] line-clamp-3 text-pretty font-semibold antialiased" style={{ fontSize: 'clamp(0.875rem, 3cqw, 1.125rem)' }}>
                {title}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, onClick }: { template: TemplateData; onClick: () => void }) {
  const catColor = CATEGORY_COLORS[template.category] || 'text-[#737373]';
  return (
    <div className="group relative cursor-pointer transition-all duration-200" onClick={onClick}>
      <div className="relative w-full overflow-hidden rounded-xl aspect-square">
        <img
          src={template.img}
          alt={template.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
          <p className="text-white text-xs font-medium line-clamp-2">{template.title}</p>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <span className={`text-[10px] font-semibold tracking-[0.05em] uppercase ${catColor}`}>{template.category}</span>
        <p className="text-[#b4b4b4] text-xs font-medium line-clamp-2 leading-snug mt-0.5">{template.title}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO BANNER
   ═══════════════════════════════════════════════════════════════ */

function HeroBanner() {
  return (
    <section className="relative h-[350px] w-full flex-shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a1a] via-[#0d0d2b] to-[#0f0f1a]">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] rounded-full bg-[#336aea]/20 blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-purple-500/15 blur-[80px]" />
        <div className="absolute bottom-0 left-[50%] w-[500px] h-[200px] rounded-full bg-emerald-500/10 blur-[80px]" />
      </div>
      <div className="absolute inset-0 overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent 0%, transparent 30%, black 52%, black 100%)' }}>
        <svg className="absolute" style={{ left: '35%', top: '10%', width: '65%', height: '90%' }} viewBox="0 0 600 300" fill="none">
          <path d="M 80 90 C 130 90 110 180 160 180" stroke="rgba(68, 182, 120, 0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 260 150 C 310 150 290 210 340 210" stroke="rgba(101, 105, 189, 0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 440 160 C 490 160 460 90 510 90" stroke="rgba(101, 105, 189, 0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 380 40 C 430 40 450 70 510 70" stroke="rgba(68, 182, 120, 0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <g transform="translate(10, 50)">
            <text x="10" y="-6" fill="rgba(180,180,180,0.3)" fontSize="8" fontWeight="500">Prompt</text>
            <rect width="130" height="65" rx="12" fill="#1a1a2e" stroke="rgba(68, 182, 120, 0.3)" strokeWidth="1" />
            <text x="12" y="18" fill="rgba(180,180,180,0.7)" fontSize="7.5" fontFamily="Inter, sans-serif">
              <tspan x="12" dy="0">Dreamy full-body portrait of</tspan>
              <tspan x="12" dy="12">a silhouetted figure in motion</tspan>
              <tspan x="12" dy="12">against a soft, cool blue</tspan>
              <tspan x="12" dy="12">backdrop—long exposure</tspan>
            </text>
            <circle cx="142" cy="16" r="6" fill="#1a1a1a" stroke="rgb(68, 182, 120)" strokeWidth="1.5" />
          </g>
          <g transform="translate(175, 125)">
            <text x="10" y="-6" fill="rgba(180,180,180,0.3)" fontSize="8" fontWeight="500">Image Generator</text>
            <rect width="80" height="80" rx="12" fill="#1a1a2e" stroke="rgba(101, 105, 189, 0.3)" strokeWidth="1" />
            <image href="/spaces-assets/04-image.png" x="2" y="2" width="76" height="76" clipPath="inset(0 round 10px)" />
            <circle cx="-12" cy="64" r="6" fill="#1a1a1a" stroke="rgb(68, 182, 120)" strokeWidth="1.5" />
            <circle cx="92" cy="16" r="6" fill="#1a1a1a" stroke="rgb(101, 105, 189)" strokeWidth="1.5" />
          </g>
          <g transform="translate(355, 130)">
            <text x="10" y="-6" fill="rgba(180,180,180,0.3)" fontSize="8" fontWeight="500">Upscaler</text>
            <rect width="80" height="80" rx="12" fill="#1a1a2e" stroke="rgba(101, 105, 189, 0.3)" strokeWidth="1" />
            <image href="/spaces-assets/04-image.png" x="2" y="2" width="76" height="76" clipPath="inset(0 round 10px)" />
            <circle cx="-12" cy="64" r="6" fill="#1a1a1a" stroke="rgb(101, 105, 189)" strokeWidth="1.5" />
            <circle cx="92" cy="16" r="6" fill="#1a1a1a" stroke="rgb(101, 105, 189)" strokeWidth="1.5" />
          </g>
          <g transform="translate(280, -5)">
            <text x="10" y="-6" fill="rgba(180,180,180,0.3)" fontSize="8" fontWeight="500">Prompt</text>
            <rect width="130" height="55" rx="12" fill="#1a1a2e" stroke="rgba(68, 182, 120, 0.3)" strokeWidth="1" />
            <text x="12" y="18" fill="rgba(180,180,180,0.7)" fontSize="7.5" fontFamily="Inter, sans-serif">
              <tspan x="12" dy="0">Slowly and cinematically</tspan>
              <tspan x="12" dy="12">zoom out of the scene,</tspan>
              <tspan x="12" dy="12">focusing on the subject</tspan>
            </text>
            <circle cx="142" cy="16" r="6" fill="#1a1a1a" stroke="rgb(68, 182, 120)" strokeWidth="1.5" />
          </g>
          <g transform="translate(510, 28)">
            <text x="10" y="-6" fill="rgba(180,180,180,0.3)" fontSize="8" fontWeight="500">Video Generator</text>
            <rect width="80" height="80" rx="12" fill="#1a1a2e" stroke="rgba(176, 124, 198, 0.3)" strokeWidth="1" />
            <rect x="2" y="2" width="76" height="76" rx="10" fill="#2a1a3a" />
            <polygon points="35,30 35,54 52,42" fill="rgba(176, 124, 198, 0.8)" />
            <circle cx="-12" cy="64" r="6" fill="#1a1a1a" stroke="rgb(101, 105, 189)" strokeWidth="1.5" />
            <circle cx="-12" cy="38" r="6" fill="#1a1a1a" stroke="rgb(68, 182, 120)" strokeWidth="1.5" />
          </g>
        </svg>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-4 p-14">
        <SpacesLogo className="text-[#e8e8e8] mb-3 h-14 w-auto self-start" />
        <p className="text-[#8a8a8a] text-sm max-w-[300px]">
          Create, connect, and collaborate on an infinite canvas
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function Spaces() {
  const [activeTab, setActiveTab] = useState<'templates' | 'my-spaces'>('templates');
  const [boardFilter, setBoardFilter] = useState<'all' | 'mine'>('mine');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);

  return (
    <div className="flex h-screen bg-[#0f0f0f] gap-2 p-2 font-['Inter',sans-serif]">
      {/* ──── SIDEBAR ──── */}
      <div className="relative z-[100] h-full w-56 shrink-0 overflow-hidden transition-all duration-200">
        <nav className="rounded-xl bg-[#1a1a1a] flex flex-col gap-4 overflow-clip px-5 py-4 h-full">
          <div className="flex w-full shrink-0 items-center justify-between">
            <div className="relative flex h-8 w-full items-center">
              <div className="flex size-8 shrink-0 items-center justify-center">
                <FreepikLogo />
              </div>
              <button className="absolute right-0 top-0 flex size-8 items-center justify-center rounded-lg hover:bg-white/[0.06] transition-opacity">
                <PanelLeft className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <button className="flex items-center gap-2 justify-between w-full h-8 rounded px-2 border border-white/10 bg-[#252525] hover:bg-[#2a2a2a] transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-cover bg-center" style={{ backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <span className="text-white text-xs font-semibold select-none">P</span>
              </div>
              <span className="text-[#e8e8e8] text-sm truncate">Personal project</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#737373]" strokeWidth={1.5} />
          </button>

          <div className="flex flex-col gap-1 shrink-0">
            {[
              { icon: Search, label: 'Search' },
              { icon: Image, label: 'Stock' },
              { icon: Globe, label: 'Community' },
              { icon: FolderOpen, label: 'View project' },
            ].map((item) => (
              <button key={item.label} className="flex w-full items-center gap-2 rounded-lg px-[9px] h-8 text-xs hover:bg-white/[0.06] transition-colors">
                <item.icon className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
                <span className="text-[#b4b4b4] text-xs">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="h-px bg-white/10 w-full" />

          <div className="flex flex-col gap-1 min-h-0 overflow-y-auto flex-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800">
            {SIDEBAR_TOOLS.map((tool) => (
              <SidebarItem key={tool.label} icon={tool.icon} label={tool.label} active={tool.active} />
            ))}
            <div className="h-px bg-transparent" />
            <button className="flex w-full items-center gap-2 rounded-lg px-[9px] h-8 text-xs hover:bg-white/[0.06] transition-colors">
              <Grid3X3 className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
              <span className="text-[#b4b4b4] text-xs">All tools</span>
            </button>
          </div>

          <div className="mt-auto flex w-full shrink-0 items-center justify-between">
            <div className="flex items-center gap-1">
              <button className="flex items-center justify-center size-8 rounded-lg hover:bg-white/[0.06] transition-colors">
                <GraduationCap className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
              </button>
              <button className="relative flex items-center justify-center size-8 rounded-lg hover:bg-white/[0.06] transition-colors">
                <Bell className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
                <div className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-[#336aea] text-white text-[9px]">16</div>
              </button>
              <button className="flex items-center justify-center size-8 rounded-lg hover:bg-white/[0.06] transition-colors">
                <Moon className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
              </button>
            </div>
            <button className="flex items-center justify-center size-8 rounded-lg hover:bg-white/[0.06] transition-colors">
              <MoreHorizontal className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
            </button>
          </div>
        </nav>
      </div>

      {/* ──── MAIN CONTENT ──── */}
      <div className="flex-1 flex flex-col rounded-xl bg-[#1c1c1c] overflow-hidden">
        <header className="z-50 flex h-14 w-full min-w-0 shrink-0 items-center gap-2 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <a className="text-[#e8e8e8] hover:bg-white/[0.04] flex items-center gap-2.5 rounded px-2 py-1 text-xs cursor-pointer">
              Personal project
            </a>
            <span className="text-[#737373] opacity-50 mx-0.5">/</span>
            <a className="text-[#e8e8e8] hover:bg-white/[0.04] flex items-center gap-2.5 rounded px-2 py-1 text-xs cursor-pointer font-medium">
              Spaces
            </a>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button className="text-[#737373] hover:bg-white/[0.06] hover:text-[#e8e8e8] flex items-center justify-center rounded-lg p-2 transition-colors">
              <Sparkles className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <div className="relative w-8 h-8">
              <svg width="100%" height="100%" viewBox="0 0 32 32" overflow="visible">
                <circle cx="16" cy="16" r="16" fill="transparent" stroke="rgba(51,106,234,0.3)" strokeWidth="3" strokeLinecap="round" />
                <circle cx="16" cy="16" r="16" fill="none" stroke="#EB644C" strokeWidth="3" strokeLinecap="round" strokeDasharray="93.72 6.28" transform="rotate(-90 16 16)" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <img src="/spaces-assets/5657079-241129104410.jpg" className="w-6 h-6 rounded-full object-contain bg-[#2a2a2a]" alt="avatar" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col overflow-y-auto rounded-xl bg-[#1a1a1a] mx-0">
            <div className="px-6 py-0">
              <div className="pb-2 pt-6">
                <HeroBanner />

                <div className="mt-8">
                  <h2 className="text-[#e8e8e8] text-lg font-semibold mb-4">Getting started</h2>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800">
                    {GETTING_STARTED.map((card) => (
                      <GettingStartedCard key={card.title} {...card} />
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-b border-white/10">
                  <div className="flex gap-0">
                    <button
                      onClick={() => setActiveTab('templates')}
                      className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'templates'
                          ? 'border-[#f4f4f5] text-white'
                          : 'border-transparent text-[#737373] hover:text-[#b4b4b4]'
                      }`}
                    >
                      Templates
                    </button>
                    <button
                      onClick={() => setActiveTab('my-spaces')}
                      className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'my-spaces'
                          ? 'border-[#f4f4f5] text-white'
                          : 'border-transparent text-[#737373] hover:text-[#b4b4b4]'
                      }`}
                    >
                      My spaces
                    </button>
                  </div>
                </div>

                {activeTab === 'templates' && (
                  <div className="flex items-center gap-2 mt-4 mb-4">
                    <button
                      onClick={() => setBoardFilter('mine')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        boardFilter === 'mine'
                          ? 'bg-[#336aea] text-white'
                          : 'bg-white/[0.06] text-[#b4b4b4] hover:bg-white/10'
                      }`}
                    >
                      For you
                    </button>
                    <button
                      onClick={() => setBoardFilter('all')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        boardFilter === 'all'
                          ? 'bg-[#336aea] text-white'
                          : 'bg-white/[0.06] text-[#b4b4b4] hover:bg-white/10'
                      }`}
                    >
                      All templates
                    </button>
                  </div>
                )}

                {activeTab === 'templates' && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pb-8">
                    {TEMPLATES.map((tmpl) => (
                      <TemplateCard
                        key={tmpl.title}
                        template={tmpl}
                        onClick={() => setSelectedTemplate(tmpl)}
                      />
                    ))}
                  </div>
                )}

                {activeTab === 'my-spaces' && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                      <Zap className="w-8 h-8 text-[#737373]" strokeWidth={1.5} />
                    </div>
                    <p className="text-[#737373] text-sm">No spaces yet. Create your first one!</p>
                    <button className="mt-4 px-6 py-2 rounded-lg bg-[#336aea] text-white text-sm font-medium hover:bg-[#2955bb] transition-colors">
                      Create space
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──── TEMPLATE DETAIL MODAL ──── */}
      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}
