// services/firebase.js
const STORAGE_BUCKET = "robotics-documentation.firebasestorage.app";

export const uploadVideoToFirebase = async (fileUri, fileName, onProgress) => {
  try {
    // 1. Fetch file data as blob
    const response = await fetch(fileUri);
    const blob = await response.blob();

    // 2. Format unique storage path
    const cleanFileName = fileName || 'video.mp4';
    const storagePath = `videos/${Date.now()}_${cleanFileName}`;
    const encodedPath = encodeURIComponent(storagePath);
    
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?name=${encodedPath}`;

    // 3. Upload using XMLHttpRequest for progress updates
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const responseData = JSON.parse(xhr.responseText);
          const downloadToken = responseData.downloadTokens || '';
          
          // Construct public access URL
          const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media&token=${downloadToken}`;
          resolve(downloadUrl);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during video upload.'));

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Content-Type', blob.type || 'video/mp4');
      xhr.send(blob);
    });
  } catch (error) {
    console.error('Firebase REST upload error:', error);
    throw error;
  }
};