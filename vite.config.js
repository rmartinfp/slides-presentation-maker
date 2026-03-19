{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 Menlo-Regular;}
{\colortbl;\red255\green255\blue255;\red0\green0\blue255;\red255\green255\blue254;\red0\green0\blue0;
\red144\green1\blue18;\red15\green112\blue1;\red14\green110\blue109;}
{\*\expandedcolortbl;;\cssrgb\c0\c0\c100000;\cssrgb\c100000\c100000\c99608;\cssrgb\c0\c0\c0;
\cssrgb\c63922\c8235\c8235;\cssrgb\c0\c50196\c0;\cssrgb\c0\c50196\c50196;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\deftab720
\pard\pardeftab720\partightenfactor0

\f0\fs26 \cf2 \cb3 \expnd0\expndtw0\kerning0
\outl0\strokewidth0 \strokec2 import\cf0 \strokec4  base44 \cf2 \strokec2 from\cf0 \strokec4  \cf5 \strokec5 "@base44/vite-plugin"\cf0 \cb1 \strokec4 \
\cf2 \cb3 \strokec2 import\cf0 \strokec4  react \cf2 \strokec2 from\cf0 \strokec4  \cf5 \strokec5 '@vitejs/plugin-react'\cf0 \cb1 \strokec4 \
\cf2 \cb3 \strokec2 import\cf0 \strokec4  \{ defineConfig \} \cf2 \strokec2 from\cf0 \strokec4  \cf5 \strokec5 'vite'\cf0 \cb1 \strokec4 \
\
\pard\pardeftab720\partightenfactor0
\cf6 \cb3 \strokec6 // https://vite.dev/config/\cf0 \cb1 \strokec4 \
\pard\pardeftab720\partightenfactor0
\cf2 \cb3 \strokec2 export\cf0 \strokec4  \cf2 \strokec2 default\cf0 \strokec4  defineConfig(\{\cb1 \
\pard\pardeftab720\partightenfactor0
\cf0 \cb3   logLevel: \cf5 \strokec5 'error'\cf0 \strokec4 , \cf6 \strokec6 // Suppress warnings, only show errors\cf0 \cb1 \strokec4 \
\cb3   plugins: [\cb1 \
\cb3     base44(\{\cb1 \
\cb3       \cf6 \strokec6 // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.\cf0 \cb1 \strokec4 \
\cb3       \cf6 \strokec6 // can be removed if the code has been updated to use the new SDK imports from @base44/sdk\cf0 \cb1 \strokec4 \
\cb3       legacySDKImports: process.env.\cf7 \strokec7 BASE44_LEGACY_SDK_IMPORTS\cf0 \strokec4  === \cf5 \strokec5 'true'\cf0 \cb1 \strokec4 \
\cb3     \}),\cb1 \
\cb3     react(),\cb1 \
\cb3   ]\cb1 \
\cb3 \});\cb1 \
}