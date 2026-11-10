import React, { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
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

// Google Drive links come in several shapes (/file/d/ID/view, open?id=ID, uc?id=ID,
// uc?export=download&id=ID). Drive will not stream them as a plain video file, so
// they are shown with Drive's own player instead.
export const driveFileId = (url) => {
  const text = String(url || '').trim();
  if (!/^https:\/\/(drive|docs|drive\.usercontent)\.google\.com\//i.test(text)) return null;
  const path = /\/file\/d\/([A-Za-z0-9_-]{10,})/.exec(text);
  if (path) return path[1];
  const query = /[?&]id=([A-Za-z0-9_-]{10,})/.exec(text);
  return query ? query[1] : null;
};

export const VideoPill = ({
  title = '',
  videoUrl = '',
  caption = '',
  gif = false,
  onUpdateGif,
  onUpdateTitle,
  onUpdateCaption,
  onUpdateVideoUrl,
  setHasSaved,
  loggedIn = false,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const driveId = driveFileId(videoUrl);
  // Drive's embedded player can't loop or hide its controls, so in GIF mode a Drive
  // file is streamed straight into the normal player instead (fine for short, small clips).
  const driveEmbed = !!driveId && !gif;
  const playUrl = driveId && gif
    ? `https://drive.google.com/uc?export=download&id=${driveId}`
    : videoUrl;
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const player = useVideoPlayer(null, (createdPlayer) => {
    createdPlayer.loop = false;
    createdPlayer.muted = false;
    createdPlayer.volume = 1;
  });

  // GIF mode: silent, looping, starts by itself, no controls.
  useEffect(() => {
    player.loop = gif;
    player.muted = gif;
    // Only start now if the video is already loaded; a fresh load starts it itself.
    // Calling play() mid-load is what raises "play() request was interrupted".
    if (gif && playUrl && !driveEmbed && player.status === 'readyToPlay') {
      try { player.play(); } catch (e) { /* ignore */ }
    }
  }, [player, gif, playUrl, driveEmbed]);

  useEffect(() => {
    // Drive videos play in Drive's own embedded player, not in this one.
    player.replaceAsync(driveEmbed ? null : playUrl || null).then(() => {
      if (gif && playUrl && !driveEmbed) {
        try { player.play(); } catch (e) { /* ignore */ }
      }
    }).catch((error) => {
      console.error('Video load error:', error);
    });
  }, [player, playUrl, driveEmbed, gif]);

  const useLink = () => {
    const link = linkDraft.trim();
    if (!/^https:\/\/\S+$/i.test(link)) {
      setLinkError('Paste a link that starts with https://');
      return;
    }
    if (/^https:\/\/(drive|docs|drive\.usercontent)\.google\.com\//i.test(link) && !driveFileId(link)) {
      setLinkError("That Google Drive link doesn't contain a file. Use the file's Share link.");
      return;
    }
    setLinkError('');
    setLinkDraft('');
    if (onUpdateVideoUrl) onUpdateVideoUrl(link);
    if (setHasSaved) setHasSaved(false);
  };

  const removeVideo = () => {
    if (onUpdateVideoUrl) onUpdateVideoUrl('');
    if (setHasSaved) setHasSaved(false);
  };

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
        {driveEmbed ? (
          Platform.OS === 'web' ? (
            <iframe
              title={title || 'Video'}
              src={`https://drive.google.com/file/d/${driveId}/preview`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 0, borderRadius: 8 }}
            />
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => Linking.openURL(`https://drive.google.com/file/d/${driveId}/view`)}>
              <Text style={styles.uploadButtonText}>Open video in Google Drive</Text>
            </TouchableOpacity>
          )
        ) : videoUrl ? (
          <VideoView
            player={player}
            contentFit="contain"
            nativeControls={!gif}
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

      {loggedIn && videoUrl ? (
        <TouchableOpacity
          style={styles.gifToggle}
          onPress={() => {
            if (onUpdateGif) onUpdateGif(!gif);
            if (setHasSaved) setHasSaved(false);
          }}>
          <View style={[styles.gifBox, gif && styles.gifBoxOn]}>
            {gif ? <Text style={styles.gifTick}>✓</Text> : null}
          </View>
          <Text style={styles.gifLabel}>GIF mode (loops silently, no controls)</Text>
        </TouchableOpacity>
      ) : null}
      {loggedIn && driveId && gif ? (
        <Text style={styles.linkHint}>
          GIF mode streams the Drive file directly, which works best for short, small clips (under ~100 MB). Larger files may not play.
        </Text>
      ) : null}
      {loggedIn && !uploading && (
        <View style={styles.linkRow}>
          <TextInput
            style={styles.linkInput}
            value={linkDraft}
            onChangeText={(text) => {
              setLinkDraft(text);
              setLinkError('');
            }}
            onSubmitEditing={useLink}
            placeholder={videoUrl ? 'Replace with a link (Google Drive or https://…)' : 'Or paste a link (Google Drive or https://…)'}
            placeholderTextColor="#A0AEC0"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.smallButton} onPress={useLink}>
            <Text style={styles.smallButtonText}>Use link</Text>
          </TouchableOpacity>
          {videoUrl ? (
            <TouchableOpacity style={[styles.smallButton, styles.removeButton]} onPress={removeVideo}>
              <Text style={styles.smallButtonText}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {loggedIn && linkError ? <Text style={styles.linkError}>{linkError}</Text> : null}
      {loggedIn && driveId ? (
        <Text style={styles.linkHint}>
          Google Drive video: the file must be shared as "Anyone with the link can view".
        </Text>
      ) : null}

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
  gifToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  gifBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#A0AEC0', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  gifBoxOn: { backgroundColor: '#207ADB', borderColor: '#207ADB' },
  gifTick: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  gifLabel: { color: '#4A5568', fontSize: 13 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  linkInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#1A202C',
  },
  smallButton: {
    marginLeft: 6,
    backgroundColor: '#207ADB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  removeButton: { backgroundColor: '#C53030' },
  smallButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  linkError: { color: '#C53030', fontSize: 12, marginTop: 4 },
  linkHint: { color: '#718096', fontSize: 12, marginTop: 4 },
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
