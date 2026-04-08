import React, { useState } from 'react';
import { Search, Globe, FolderOpen, Sparkles, Image, Video, Mic, ArrowUp, ChevronDown, Moon, Bell, MoreHorizontal, GraduationCap, Grid3X3, Pin, PanelLeft, Play, Zap, Maximize2 } from 'lucide-react';

/* ───────── data ───────── */

const GETTING_STARTED = [
  { title: 'Discover the List Node', img: '/spaces-assets/v9Bx1uTnft9Ve6yYTYPU9lZ8FUEU7LeJZOlsDn4E.jpg' },
  { title: 'Turn ideas into video', img: '/spaces-assets/zzJJ98yu0z1JAdV42orAtiqksiGMPav0VsoTMcON.jpg' },
  { title: 'Create images', img: '/spaces-assets/u9buzY40W7eh6FBPOWkgCc0fqGORmRP8w9Cja8r0.jpg' },
  { title: 'Welcome to Spaces', img: '/spaces-assets/01UurYLuFmvugBfcgnHk4A98OuWys91nVI8BpiYv.jpg' },
  { title: 'Create a Moodboard', img: '/spaces-assets/UBh25cOj6yux3qRJLTYYRgXu6Z29UgpegG5iNu6x.jpg' },
  { title: 'Explore connections', img: '/spaces-assets/VCK7OfjJhQoA9L8Ck4DWjcsCq2ISGiBMuEEmUHDb.jpg' },
];

const TEMPLATES = [
  { title: 'Product catalog cards with Designer Node', img: '/spaces-assets/PH5HO4hKJ1vn1ETjUFjDTmUQ03pbrFxbRCgNY5tj.jpg' },
  { title: 'Multiformat ad production with Designer Node', img: '/spaces-assets/MGPyhDmZlP9C7PglT6Nb5mE0DGfQP7siNeXk4rhA.jpg' },
  { title: 'Create poster series with Designer Node', img: '/spaces-assets/FCs9hBnCrz9RsFMkxQjTNVXjU97aEMQEyaYcNzut.jpg' },
  { title: 'Transitions template', img: '/spaces-assets/NvnSShxIiIRz4K8XjYddNpcK5j1gKYo3i5m6Q1hh.jpg' },
  { title: 'Scene builder from reference sheets', img: '/spaces-assets/JcdupfHlec1MA0sMblrVd86LXDxTffKQu7bCQWnc.jpg' },
  { title: 'High-end skin retouch & makeup', img: '/spaces-assets/7yvC0tX8G2ZEQ0nsJc3W8cmMBtQTT81DRFp0Lxx4.jpg' },
  { title: 'Build your character', img: '/spaces-assets/K5fSl5ZOTsAf5Zh1vkkAipQ2WHehzwVgIroBvZ3I.jpg' },
  { title: 'Product designing workflow', img: '/spaces-assets/9elvV7ZQgC4c2nXlbsx3P2mY6svMZ0gi9QcXyzdW.jpg' },
  { title: 'Product marketing workflow', img: '/spaces-assets/VxT65cc0pP2DblHiGQt7PaIrgrPkC89XSwWDTTiV.jpg' },
  { title: 'Digital twin', img: '/spaces-assets/T9usZmpxRmt102dxVWfqOCRrW9fzwc9wC6RQKDdG.jpg' },
  { title: 'Create brand packaging', img: '/spaces-assets/vKj7Be2VXw8QybAIMRvMBMLUjAXGyEEQ0Och7CE7.jpg' },
  { title: 'Product shots for e-commerce', img: '/spaces-assets/GZWMbIxxn2QnTIlnnUTgivaDVa9ZwpVlnLbi0uFK.jpg' },
  { title: 'Luxury jewelry campaign visuals', img: '/spaces-assets/TdoYU2bGjwGdmrzZhve6hTA9tjyO7zta2QkUTzFw.jpg' },
  { title: 'Social content studio', img: '/spaces-assets/GRXnox10C3ZiNhF1sSilocgpRJDX09219R7URZPP.jpg' },
  { title: 'Create social thumbnails', img: '/spaces-assets/UDyfgTdGXVrrFat4aikxj0btqFQ3BcbeW5pWhdOh.jpg' },
  { title: 'Expand your character', img: '/spaces-assets/IdFxUNM9dcy9qM9rLYRZi3VgheGi53LPQj8RgjiZ.jpg' },
  { title: 'Y2k aesthetic portrait transformation', img: '/spaces-assets/m73yl1Tu16fDCfCe1BAQQP64wYkkkJhzDFm3y22t.jpg' },
  { title: 'Create t-Shirt product content', img: '/spaces-assets/moNXnMPPEOYzr83Fjf3WOIHadBej1UjgS6JddC3S.jpg' },
  { title: 'Design video thumbnails', img: '/spaces-assets/8isnijzOa6ohuAO2Bf1F0BaDAq3uT7AzwTpDKHb3.jpg' },
  { title: 'Render multiple views', img: '/spaces-assets/7cwDfy8jGqdxKjxjS9DRhpXQ48QocjHWyWoSZwdy.jpg' },
  { title: 'Adapt ad for global markets', img: '/spaces-assets/NZpq2Bp21bsvBu9PcwxsWGign9cQm03KuMZK5mZk.jpg' },
  { title: 'Photoshoot to ad campaign', img: '/spaces-assets/4nT6XE9R7Qs505ZktRHf5rc2iBK1bWlXcQWueLKG.jpg' },
  { title: 'Batch ad variation', img: '/spaces-assets/S0rMlp4E1aOkFbhP3MkSQqVc3TVJZ6PEF6kxcFWq.jpg' },
  { title: 'Marketing campaign', img: '/spaces-assets/l2qMjkwcls3tgX5czE6cFzEuR5dNnr38KEXU4ETn.jpg' },
  { title: 'Multiformat social media', img: '/spaces-assets/nVjSrh3xQPigCy9RymGACZkKiNoYN7FYazLGXKAV.jpg' },
  { title: 'Multiple copy variations', img: '/spaces-assets/0Kge4GBcvBU2kWsFAvW9K3u5XTTRSScvBi5hmOTk.jpg' },
  { title: 'Batch product photos', img: '/spaces-assets/fBZiDB5utXAwMJ10nYJdAZK6rIyHg1cof8V91ZuW.jpg' },
  { title: 'Create product photoshoots', img: '/spaces-assets/nDnB92UHDYTNCp0xtmwWLS1SuhCqOXc5aQU2K7kf.jpg' },
  { title: 'Create visuals for products', img: '/spaces-assets/l1wW9mA3wmsOb8RNTgAGPE7X1DF8A7p9IbNrpMmX.jpg' },
  { title: 'Dynamic angles', img: '/spaces-assets/S6z90KmCHH7J8uWVRpmywG991xG5lnHxWNm84q5v.jpg' },
  { title: 'Character sheet', img: '/spaces-assets/TCuGEti0eO3o7GGKEw0skk4QHB83N4IQsXkx9Zqw.jpg' },
  { title: 'Try new materials', img: '/spaces-assets/5Ly2HIyIribW8CPqJRdOEWXLItossnybtw5bQCl5.jpg' },
  { title: 'Design full brand book', img: '/spaces-assets/jxoyebAebd5KaTpvAnaumSx50GImjSljxZDNSzgw.jpg' },
  { title: 'Create stationery brand identity', img: '/spaces-assets/67Py1gbk5Tvuqx0ocL7hfkmgbzpZDmxJQLB0E7qP.jpg' },
  { title: 'Visualize outfit across scenarios', img: '/spaces-assets/gXuAQcGd64KJ2UGJSjENkYkWcbSlZlGZWInf2PTZ.jpg' },
  { title: 'Generate product showcase video', img: '/spaces-assets/tmU56j8f06POpO1SUqCGPwRy4edYXzIBD6S6OIhw.jpg' },
  { title: 'Animate a snapshot', img: '/spaces-assets/bQzIjq49CCyWOKAQfgEexaXjKu1NvJpb8r9R0Nzk.jpg' },
  { title: 'Transform rooms into designs', img: '/spaces-assets/GbO63mZVRi9ahKy96k3W972e1HgQd8Ka5YKG72nd.jpg' },
  { title: 'Design Instagram reel cover', img: '/spaces-assets/cFQzxiATeg49hrx5c3yEiGtoNqzYyeCZqhRabApI.jpg' },
  { title: 'Customize designs for social media', img: '/spaces-assets/gkIyijY1ZNm6vkkr2Ixi3ulQANI00wH6dHIZlYui.jpg' },
  { title: 'Create consistent sequential scenes', img: '/spaces-assets/2y7xewrqa7s7n1wgmEd6Qprw0XwU5hA5h0Hw3nTQ.jpg' },
  { title: 'Generate hyperlapse', img: '/spaces-assets/asJaclvn32t7XwTLSfj1Rns58LumNeydSgRYHPEW.jpg' },
  { title: 'Create storyboard from image', img: '/spaces-assets/biSejsPF2HU2h5Isz1BnifuVwsANuDUszEXKvJ2v.jpg' },
  { title: 'Create sport brand visuals', img: '/spaces-assets/p1oJn6FB13ICx3o1nycoutQovEf3k3KRqcfNqHhH.jpg' },
  { title: 'Generate a professional headshot', img: '/spaces-assets/gTYzLez8E07QpcJTamss2BYvCB8Q8GjRcd5cezHC.jpg' },
  { title: 'Create winter visuals', img: '/spaces-assets/tYbraWy1yiE6ia1wgawXpMwnB3YIvMCVWFaXIS4t.jpg' },
  { title: 'Sketch to product render', img: '/spaces-assets/dxsGK8EKyG7ou7gpcLnhF04mQikw80m8aS5DFrwU.jpg' },
  { title: 'Modify facial expressions', img: '/spaces-assets/Sggu7Vg7G5x9LmUzknsVcpXETKtXLA1tlyvlPqjP.jpg' },
  { title: 'Turn casual photos into studio shots', img: '/spaces-assets/hFruPYYT8rn7R0yX9X1Um0xrYHNuwKZqaV8YIDwp.jpg' },
  { title: 'Prototyping Moodboard Product', img: '/spaces-assets/ahxSizRniQkUOnFKb491O6gWENQMVdE0IKVwfRiC.jpg' },
  { title: 'Restore your memories', img: '/spaces-assets/ppdOXKK1kSKIgdu6G5nILgGZ7KJMoCjpTOuFCGvv.jpg' },
  { title: 'Brand identity', img: '/spaces-assets/DfcCKtPZy9gNyqNUjmTAZ4f5LESJCfH0aziMqLvn.jpg' },
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

/* ───────── logo ───────── */

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

/* ───────── Freepik logo ───────── */

function FreepikLogo() {
  return (
    <svg className="w-6 h-6 fill-current text-[#e8e8e8]" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

/* ───────── components ───────── */

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

function TemplateCard({ title, img }: { title: string; img: string }) {
  return (
    <div className="group relative cursor-pointer transition-all duration-200">
      <div className="relative w-full overflow-hidden rounded-xl aspect-square">
        <img
          src={img}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
          <p className="text-white text-xs font-medium line-clamp-2">{title}</p>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-[#b4b4b4] text-xs font-medium line-clamp-2 leading-snug">{title}</p>
      </div>
    </div>
  );
}

/* ───────── hero banner canvas (node graph illustration) ───────── */

function HeroBanner() {
  return (
    <section className="relative h-[350px] w-full flex-shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a1a] via-[#0d0d2b] to-[#0f0f1a]">
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] rounded-full bg-[#336aea]/20 blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-purple-500/15 blur-[80px]" />
        <div className="absolute bottom-0 left-[50%] w-[500px] h-[200px] rounded-full bg-emerald-500/10 blur-[80px]" />
      </div>

      {/* Node graph visualization on the right */}
      <div className="absolute inset-0 overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent 0%, transparent 30%, black 52%, black 100%)' }}>
        <svg className="absolute" style={{ left: '35%', top: '10%', width: '65%', height: '90%' }} viewBox="0 0 600 300" fill="none">
          {/* Connection lines */}
          <path d="M 80 90 C 130 90 110 180 160 180" stroke="rgba(68, 182, 120, 0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 260 150 C 310 150 290 210 340 210" stroke="rgba(101, 105, 189, 0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 440 160 C 490 160 460 90 510 90" stroke="rgba(101, 105, 189, 0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 380 40 C 430 40 450 70 510 70" stroke="rgba(68, 182, 120, 0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Prompt node 1 */}
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

          {/* Image Generator node */}
          <g transform="translate(175, 125)">
            <text x="10" y="-6" fill="rgba(180,180,180,0.3)" fontSize="8" fontWeight="500">Image Generator</text>
            <rect width="80" height="80" rx="12" fill="#1a1a2e" stroke="rgba(101, 105, 189, 0.3)" strokeWidth="1" />
            <image href="/spaces-assets/04-image.png" x="2" y="2" width="76" height="76" clipPath="inset(0 round 10px)" />
            <circle cx="-12" cy="64" r="6" fill="#1a1a1a" stroke="rgb(68, 182, 120)" strokeWidth="1.5" />
            <circle cx="92" cy="16" r="6" fill="#1a1a1a" stroke="rgb(101, 105, 189)" strokeWidth="1.5" />
          </g>

          {/* Upscaler node */}
          <g transform="translate(355, 130)">
            <text x="10" y="-6" fill="rgba(180,180,180,0.3)" fontSize="8" fontWeight="500">Upscaler</text>
            <rect width="80" height="80" rx="12" fill="#1a1a2e" stroke="rgba(101, 105, 189, 0.3)" strokeWidth="1" />
            <image href="/spaces-assets/04-image.png" x="2" y="2" width="76" height="76" clipPath="inset(0 round 10px)" />
            <circle cx="-12" cy="64" r="6" fill="#1a1a1a" stroke="rgb(101, 105, 189)" strokeWidth="1.5" />
            <circle cx="92" cy="16" r="6" fill="#1a1a1a" stroke="rgb(101, 105, 189)" strokeWidth="1.5" />
          </g>

          {/* Prompt node 2 */}
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

          {/* Video Generator node */}
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

      {/* Logo + subtitle on the left */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-4 p-14">
        <SpacesLogo className="text-[#e8e8e8] mb-3 h-14 w-auto self-start" />
        <p className="text-[#8a8a8a] text-sm max-w-[300px]">
          Create, connect, and collaborate on an infinite canvas
        </p>
      </div>
    </section>
  );
}

/* ───────── main page ───────── */

export default function Spaces() {
  const [activeTab, setActiveTab] = useState<'templates' | 'my-spaces'>('templates');
  const [boardFilter, setBoardFilter] = useState<'all' | 'mine'>('mine');

  return (
    <div className="flex h-screen bg-[#0f0f0f] gap-2 p-2 font-['Inter',sans-serif]">
      {/* ──── SIDEBAR ──── */}
      <div className="relative z-[100] h-full w-56 shrink-0 overflow-hidden transition-all duration-200">
        <nav className="rounded-xl bg-[#1a1a1a] flex flex-col gap-4 overflow-clip px-5 py-4 h-full">
          {/* Logo + collapse */}
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

          {/* Project selector */}
          <button className="flex items-center gap-2 justify-between w-full h-8 rounded px-2 border border-white/10 bg-[#252525] hover:bg-[#2a2a2a] transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-cover bg-center" style={{ backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <span className="text-white text-xs font-semibold select-none">P</span>
              </div>
              <span className="text-[#e8e8e8] text-sm truncate">Personal project</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#737373]" strokeWidth={1.5} />
          </button>

          {/* Navigation */}
          <div className="flex flex-col gap-1 shrink-0">
            <button className="flex w-full items-center gap-2 rounded-lg px-[9px] h-8 text-xs hover:bg-white/[0.06] transition-colors">
              <Search className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
              <span className="text-[#b4b4b4] text-xs">Search</span>
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-[9px] h-8 text-xs hover:bg-white/[0.06] transition-colors">
              <Image className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
              <span className="text-[#b4b4b4] text-xs">Stock</span>
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-[9px] h-8 text-xs hover:bg-white/[0.06] transition-colors">
              <Globe className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
              <span className="text-[#b4b4b4] text-xs">Community</span>
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-[9px] h-8 text-xs hover:bg-white/[0.06] transition-colors">
              <FolderOpen className="w-3.5 h-3.5 text-[#b4b4b4]" strokeWidth={1.5} />
              <span className="text-[#b4b4b4] text-xs">View project</span>
            </button>
          </div>

          {/* Separator */}
          <div className="h-px bg-white/10 w-full" />

          {/* Tools */}
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

          {/* Bottom icons */}
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
        {/* Header */}
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
            {/* Avatar with progress ring */}
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

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col overflow-y-auto rounded-xl bg-[#1a1a1a] mx-0">
            <div className="px-6 py-0">
              <div className="pb-2 pt-6">
                {/* Hero Banner */}
                <HeroBanner />

                {/* Getting Started */}
                <div className="mt-8">
                  <h2 className="text-[#e8e8e8] text-lg font-semibold mb-4">Getting started</h2>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800">
                    {GETTING_STARTED.map((card) => (
                      <GettingStartedCard key={card.title} {...card} />
                    ))}
                  </div>
                </div>

                {/* Tabs */}
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

                {/* Filter bar */}
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

                {/* Template Grid */}
                {activeTab === 'templates' && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pb-8">
                    {TEMPLATES.map((tmpl) => (
                      <TemplateCard key={tmpl.title} {...tmpl} />
                    ))}
                  </div>
                )}

                {/* My Spaces (empty state) */}
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
    </div>
  );
}
