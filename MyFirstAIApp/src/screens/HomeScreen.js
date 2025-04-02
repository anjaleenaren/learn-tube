import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import axios from 'axios';
import { YOUTUBE_CONFIG } from '../utils/config';

const CATEGORIES = [
  { id: '27', name: 'Education', color: '#4CAF50' },
  { id: '25', name: 'News', color: '#2196F3' },
  { id: '28', name: 'Science & Tech', color: '#9C27B0' },
];

const TRUSTED_CHANNELS = [
  // Education
  'UCX6b17PVsYBQ0ip5gyeme-Q', // CrashCourse
  'UCEBb1b_L6zDS3xTUrIALZOw', // MIT OpenCourseWare
  // News & Politics
  'UCupvZG-5ko_eiXAupbDfxWw', // CNN
  'UC52X5wxOL_s5yw0dQk7NtgA', // Bloomberg
  // Science & Tech
  'UCtxJFU9DgUhfr2J2bveCHkQ', // Veritasium
  'UCZYTClx2T1of7BRZ86-8fow', // SciShow
];

export default function HomeScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const searchVideos = async (query = '', categoryId = null) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        part: 'snippet',
        maxResults: 20,
        q: query,
        type: 'video',
        key: YOUTUBE_CONFIG.API_KEY,
        videoCategoryId: categoryId,
        relevanceLanguage: 'en',
      };

      // Add channel filter if we have trusted channels
      // if (TRUSTED_CHANNELS.length > 0) {
      //   params.channelId = TRUSTED_CHANNELS.join('|');
      // }
      // console.log(params);

      const response = await axios.get(YOUTUBE_CONFIG.API_URL, { params });
      // console.log(response.data);

      if (response.data.items) {
        setVideos(response.data.items);
      } else {
        setVideos([]);
      }
    } catch (error) {
      setError(error.message);
      console.error('Error fetching videos:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      Alert.alert(
        'Error',
        `Failed to fetch videos: ${error.response?.data?.error?.message || error.message}`,
        [{ text: 'OK' }]
      );
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchVideos('', selectedCategory?.id);
  }, [selectedCategory]);

  const renderCategoryChip = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        { backgroundColor: item.color },
        selectedCategory?.id === item.id && styles.selectedCategoryChip,
      ]}
      onPress={() => {
        setSelectedCategory(selectedCategory?.id === item.id ? null : item);
      }}
    >
      <Text style={styles.categoryChipText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderVideoItem = ({ item }) => (
    <TouchableOpacity
      style={styles.videoItem}
      onPress={() => navigation.navigate('VideoPlayer', { videoId: item.id.videoId })}
    >
      <View style={styles.thumbnailContainer}>
        <View style={styles.thumbnail}>
          <Image
            source={{ uri: item.snippet.thumbnails.medium.url }}
            style={styles.thumbnailImage}
          />
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.snippet.title}
        </Text>
        <Text style={styles.channelTitle}>{item.snippet.channelTitle}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => searchVideos(searchQuery, selectedCategory?.id)}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => searchVideos(searchQuery, selectedCategory?.id)}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollView}
        >
          {CATEGORIES.map((category) => (
            <React.Fragment key={category.id}>
              {renderCategoryChip({ item: category })}
            </React.Fragment>
          ))}
        </ScrollView>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#f4511e" />
      ) : (
        <FlatList
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id.videoId}
          style={styles.videoList}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No videos found</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 10,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#f4511e',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  categoriesContainer: {
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoriesScrollView: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  selectedCategoryChip: {
    transform: [{ scale: 1.1 }],
  },
  categoryChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  videoList: {
    flex: 1,
  },
  videoItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
  },
  thumbnailContainer: {
    width: 120,
    height: 90,
    marginRight: 10,
  },
  thumbnail: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  channelTitle: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    padding: 15,
    backgroundColor: '#ffebee',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 5,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
}); 