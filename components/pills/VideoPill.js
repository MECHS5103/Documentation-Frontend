import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as DocumentPicker from 'expo-document-picker';
import { uploadVideoToFirebase } from '../../services/firebase';

export const VideoPill = ({
  title = '',
  videoUrl = '',
  caption = '',
  onUpdateTitle,
  onUpdateCaption,
  onUpdateVideoUrl,
  setHasSaved,
  loggedIn = false,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const player = useVideoPlayer(null, (createdPlayer) => {
    createdPlayer.loop = false;
    createdPlayer.muted = false;
    createdPlayer.volume = 1;
  });

  useEffect(() => {
    player.replaceAsync(videoUrl || null).catch((error) => {
      console.error('Video load error:', error);
    });
  }, [player, videoUrl]);

  const handlePickAndUploadVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setUploading(true);
      setProgress(0);

      const downloadURL = await uploadVideoToFirebase(
        file,
        (percent) => setProgress(percent)
      );

      if (onUpdateVideoUrl) {
        onUpdateVideoUrl(downloadURL);
      }

      if (setHasSaved) {
        setHasSaved(false);
      }
    } catch (err) {
      console.error('Video Upload Error:', err);
      alert(err.message || 'Failed to upload video.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, isMobile && { maxWidth: '100%' }]}>
      {/* Title */}
      <View style={styles.header}>
        {loggedIn ? (
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={(text) => {
              if (onUpdateTitle) onUpdateTitle(text);
              if (setHasSaved) setHasSaved(false);
            }}
            placeholder="Video Title..."
            placeholderTextColor="#A0AEC0"
          />
        ) : (
          <Text style={styles.titleText}>{title || 'Untitled Video'}</Text>
        )}
      </View>

      {/* Static 16:9 Pill Container */}
      <View style={styles.videoWrapper}>
        {videoUrl ? (
          <VideoView
            player={player}
            contentFit="contain"
            nativeControls
            style={styles.videoPlayer}
          />
        ) : (
          <View style={styles.adminControls}>
            {uploading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3182CE" />
                <Text style={styles.progressText}>Uploading... {progress}%</Text>
              </View>
            ) : loggedIn ? (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickAndUploadVideo}
              >
                <Text style={styles.uploadButtonText}>Upload Video</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noVideoText}>No video uploaded.</Text>
            )}
          </View>
        )}
      </View>

      {/* Caption */}
      <View style={styles.captionContainer}>
        {loggedIn ? (
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={(text) => {
              if (onUpdateCaption) onUpdateCaption(text);
              if (setHasSaved) setHasSaved(false);
            }}
            placeholder="Video caption..."
            placeholderTextColor="#A0AEC0"
            multiline
          />
        ) : (
          <Text style={styles.captionText}>{caption}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    maxWidth: 650,
    width: '100%',
    alignSelf: 'flex-start',
  },
  header: {
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  titleText: {
    fontFamily: 'Chewy',
    fontSize: 22,
    color: '#1A202C',
    textAlign: 'left',
  },
  titleInput: {
    fontFamily: 'Chewy',
    fontSize: 22,
    color: '#1A202C',
    borderBottomWidth: 1.5,
    borderColor: '#4A5568',
    paddingVertical: 4,
    width: '100%',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 8,
    marginVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  adminControls: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#3182CE',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noVideoText: {
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
  captionContainer: {
    marginTop: 6,
    alignItems: 'flex-start',
  },
  captionText: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'left',
  },
  captionInput: {
    fontSize: 14,
    color: '#4A5568',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 2,
    width: '100%',
  },
});

export default VideoPill;
