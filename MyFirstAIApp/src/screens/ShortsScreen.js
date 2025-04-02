import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  TextInput,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import axios from 'axios';
import { YOUTUBE_CONFIG } from '../utils/config';

const { width, height } = Dimensions.get('window');
// Calculate dimensions for vertical video (9:16 aspect ratio)
const WIDTH_MULTIPLIER = 1.5;
const videoWidth = width * WIDTH_MULTIPLIER;
const HEADER_HEIGHT = Platform.OS === 'android' ? 350 : 340;
const videoHeight = height - HEADER_HEIGHT;
// Calculate the offset needed to center the video
const VIDEO_OFFSET = (videoWidth - width) / 2;
const CATEGORIES = [
  { id: '27', name: 'Education', color: '#4CAF50' },
  { id: '25', name: 'News', color: '#2196F3' },
  { id: '28', name: 'Science & Tech', color: '#9C27B0' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

export default function ShortsScreen() {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentShortIndex, setCurrentShortIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelQuery, setChannelQuery] = useState('');
  const [searchMode, setSearchMode] = useState('content'); // 'content' or 'channel'
  
  const flatListRef = useRef(null);

  const fetchShorts = async (query = '') => {
    try {
      setLoading(true);
      setError(null);

      // Build search terms to prioritize quality content
      const searchTerms = [
        query,
        '#shorts',
        selectedCategory ? selectedCategory.name.toLowerCase() : '',
        // Add educational terms if education category is selected
        selectedCategory?.id === '27' ? 'educational learn tutorial' : ''
      ].filter(Boolean).join(' ');

      const params = {
        part: 'snippet',
        maxResults: 20,
        q: searchTerms,
        type: 'video',
        key: YOUTUBE_CONFIG.API_KEY,
        videoDuration: 'short',
        order: query ? 'relevance' : 'date', // Use date for initial feed, relevance for searches
        videoCategoryId: selectedCategory?.id,
        relevanceLanguage: selectedLanguage.code,
      };

      console.log('Fetching shorts with params:', JSON.stringify(params, null, 2));

      const response = await axios.get(YOUTUBE_CONFIG.API_URL, { params });

      console.log('API Response:', JSON.stringify({
        totalResults: response.data.pageInfo?.totalResults,
        resultsPerPage: response.data.pageInfo?.resultsPerPage,
        itemCount: response.data.items?.length
      }, null, 2));

      console.log('First 100 items:', JSON.stringify(response.data.items.slice(0, 100), null, 2));

      if (response.data.items) {
        // Enhanced filtering for better quality shorts
        const shortsVideos = response.data.items.filter(item => {
          const isShort = item.snippet.title.toLowerCase().includes('#shorts') ||
                         item.snippet.description.toLowerCase().includes('#shorts');
          
          if (!isShort) {
            console.log('Filtered out non-short:', item.snippet.title);
            return false;
          }

          // Filter out potentially low-quality content
          const title = item.snippet.title.toLowerCase();
          const description = item.snippet.description.toLowerCase();
          
          // Skip videos with spammy titles (but be less aggressive)
          if (
            (title.includes('follow me') && title.includes('like')) ||
            title.match(/!{3,}/) || // Three or more exclamation marks
            (title.match(/\$\d+/) && !title.includes('tutorial')) // Dollar amounts unless it's a tutorial
          ) {
            console.log('Filtered out promotional content:', item.snippet.title);
            return false;
          }

          // For educational category, prioritize educational content
          if (selectedCategory?.id === '27') {
            const isEducational = 
              title.includes('learn') ||
              title.includes('how to') ||
              title.includes('tutorial') ||
              title.includes('tips') ||
              title.includes('guide') ||
              description.includes('learn') ||
              description.includes('tutorial') ||
              description.includes('education') ||
              description.includes('how to');
            
            if (!isEducational) {
              console.log('Filtered out non-educational content:', item.snippet.title);
              return false;
            }
          }

          return true;
        });

        console.log(`Filtered ${response.data.items.length - shortsVideos.length} videos based on quality criteria`);
        setShorts(shortsVideos);
      }
    } catch (error) {
      setError(error.message);
      Alert.alert(
        'Error',
        'Failed to fetch shorts. Please try again later.',
        [{ text: 'OK' }]
      );
      console.error('Error fetching shorts:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchChannels = async (query) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Searching for channel:', query);

      // Add quality terms to channel search
      const channelSearchTerms = [
        query,
        selectedCategory?.id === '27' ? 'education educational learning' : '',
        selectedCategory?.name || ''
      ].filter(Boolean).join(' ');

      const response = await axios.get(YOUTUBE_CONFIG.API_URL, {
        params: {
          part: 'snippet',
          maxResults: 20,
          q: channelSearchTerms,
          type: 'channel',
          key: YOUTUBE_CONFIG.API_KEY,
        },
      });

      if (response.data.items && response.data.items.length > 0) {
        const channelId = response.data.items[0].id.channelId;
        console.log('Found channel ID:', channelId);
        
        // Build search terms for channel's shorts
        const shortsSearchTerms = [
          '#shorts',
          selectedCategory ? selectedCategory.name.toLowerCase() : '',
          selectedCategory?.id === '27' ? 'educational learn tutorial' : ''
        ].filter(Boolean).join(' ');

        const params = {
          part: 'snippet',
          maxResults: 20,
          channelId: channelId,
          q: shortsSearchTerms,
          type: 'video',
          key: YOUTUBE_CONFIG.API_KEY,
          videoDuration: 'short',
          order: 'date',
          videoCategoryId: selectedCategory?.id,
          relevanceLanguage: selectedLanguage.code,
        };

        console.log('Fetching channel shorts with params:', JSON.stringify(params, null, 2));

        const shortsResponse = await axios.get(YOUTUBE_CONFIG.API_URL, { params });

        console.log('Channel shorts response:', JSON.stringify({
          totalResults: shortsResponse.data.pageInfo?.totalResults,
          resultsPerPage: shortsResponse.data.pageInfo?.resultsPerPage,
          itemCount: shortsResponse.data.items?.length
        }, null, 2));

        if (shortsResponse.data.items) {
          const shortsVideos = shortsResponse.data.items.filter(item => {
            const isShort = item.snippet.title.toLowerCase().includes('#shorts') ||
                          item.snippet.description.toLowerCase().includes('#shorts');
            
            if (!isShort) {
              console.log('Filtered out non-short:', item.snippet.title);
              return false;
            }

            // Filter out potentially low-quality content
            const title = item.snippet.title.toLowerCase();
            const description = item.snippet.description.toLowerCase();
            
            // Skip videos with spammy titles
            if (title.includes('follow') && title.includes('like') ||
                title.match(/!!+/) || // Multiple exclamation marks
                title.match(/\$\d+/) // Dollar amounts in title
            ) {
              console.log('Filtered out promotional content:', item.snippet.title);
              return false;
            }

            // For educational category, prioritize educational content
            if (selectedCategory?.id === '27') {
              const isEducational = 
                title.includes('learn') ||
                title.includes('how to') ||
                title.includes('tutorial') ||
                title.includes('tips') ||
                description.includes('learn') ||
                description.includes('tutorial') ||
                description.includes('education');
              
              if (!isEducational) {
                console.log('Filtered out non-educational content:', item.snippet.title);
                return false;
              }
            }

            return true;
          });
          
          console.log(`Filtered ${shortsResponse.data.items.length - shortsVideos.length} videos based on quality criteria`);
          setShorts(shortsVideos);
        }
      } else {
        setShorts([]);
      }
    } catch (error) {
      setError(error.message);
      Alert.alert(
        'Error',
        'Failed to fetch channel shorts. Please try again later.',
        [{ text: 'OK' }]
      );
      console.error('Error fetching channel shorts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchMode === 'content' && searchQuery) {
      fetchShorts(searchQuery);
    } else if (searchMode === 'channel' && channelQuery) {
      searchChannels(channelQuery);
    } else {
      fetchShorts('');
    }
  }, [selectedCategory, selectedLanguage]);

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchTabsContainer}>
        <TouchableOpacity 
          style={[
            styles.searchTab, 
            searchMode === 'content' && styles.activeSearchTab
          ]}
          onPress={() => {
            setSearchMode('content');
            if (searchQuery) {
              fetchShorts(searchQuery);
            }
          }}
        >
          <Text style={[
            styles.searchTabText,
            searchMode === 'content' && styles.activeSearchTabText
          ]}>Content</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.searchTab, 
            searchMode === 'channel' && styles.activeSearchTab
          ]}
          onPress={() => setSearchMode('channel')}
        >
          <Text style={[
            styles.searchTabText,
            searchMode === 'channel' && styles.activeSearchTabText
          ]}>Channel</Text>
        </TouchableOpacity>
      </View>
      
      {searchMode === 'content' ? (
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search shorts..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchShorts(searchQuery)}
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => fetchShorts(searchQuery)}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search channels..."
            placeholderTextColor="#666"
            value={channelQuery}
            onChangeText={setChannelQuery}
            onSubmitEditing={() => searchChannels(channelQuery)}
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => searchChannels(channelQuery)}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

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

  const renderLanguageChip = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.languageChip,
        selectedLanguage.code === item.code && styles.selectedLanguageChip,
      ]}
      onPress={() => setSelectedLanguage(item)}
    >
      <Text style={[
        styles.languageChipText,
        selectedLanguage.code === item.code && styles.selectedLanguageChipText,
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderShort = ({ item, index }) => (
    <View style={[styles.shortContainer, { height: videoHeight }]}>
      <View style={styles.videoWrapper}>
        <YoutubePlayer
          height={videoHeight}
          width={videoWidth}
          play={index === currentShortIndex}
          videoId={item.id.videoId}
          webViewProps={{
            renderToHardwareTextureAndroid: true,
          }}
          initialPlayerParams={{
            controls: false,
            modestbranding: true,
            rel: 0,
            showinfo: 0,
            fs: 0,
            playsinline: 1,
            loop: 1,
          }}
          style={styles.video}
        />
      </View>
      <View style={styles.shortInfo}>
        <Text style={styles.shortTitle}>{item.snippet.title}</Text>
        <Text style={styles.channelTitle}>{item.snippet.channelTitle}</Text>
      </View>
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) {
      setCurrentShortIndex(viewableItems[0].index);
    }
  }).current;

  const renderFilters = () => (
    <SafeAreaView style={styles.filtersContainer}>
      <View style={styles.filtersContent}>
        {renderSearchBar()}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollView}
        >
          {CATEGORIES.map((category) => (
            <React.Fragment key={category.id}>
              {renderCategoryChip({ item: category })}
            </React.Fragment>
          ))}
        </ScrollView>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollView}
        >
          {LANGUAGES.map((language) => (
            <React.Fragment key={language.code}>
              {renderLanguageChip({ item: language })}
            </React.Fragment>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );

  if (loading && shorts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4511e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {renderFilters()}
        <FlatList
          ref={flatListRef}
          data={shorts}
          renderItem={renderShort}
          keyExtractor={(item) => item.id.videoId}
          pagingEnabled
          snapToAlignment="center"
          decelerationRate="fast"
          snapToInterval={videoHeight}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50
          }}
          ListEmptyComponent={() => (
            <View style={[styles.emptyContainer, { height: videoHeight }]}>
              <Text style={styles.emptyText}>No shorts available</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  filtersContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  filtersContent: {
    paddingBottom: 10,
  },
  filtersScrollView: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 6, // Slightly reduced padding
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
    fontSize: 13, // Slightly smaller font
  },
  languageChip: {
    paddingHorizontal: 15,
    paddingVertical: 6, // Slightly reduced padding
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff',
  },
  selectedLanguageChip: {
    backgroundColor: '#fff',
  },
  languageChipText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13, // Slightly smaller font
  },
  selectedLanguageChipText: {
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  shortContainer: {
    width: width,
    backgroundColor: '#000',
    marginTop: 0,
    overflow: 'hidden',
  },
  videoWrapper: {
    width: videoWidth,
    height: '100%',
    backgroundColor: '#000',
    marginLeft: -VIDEO_OFFSET, // Center the video by shifting left by half the difference between video and screen width
  },
  video: {
    alignSelf: 'center',
  },
  shortInfo: {
    position: 'absolute',
    bottom: 60, // Adjusted to be closer to the bottom
    left: 16,
    right: 16,
    padding: 0,
    backgroundColor: 'transparent',
  },
  shortTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  channelTitle: {
    color: '#fff',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  emptyContainer: {
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
  },
  searchContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchTabsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
  },
  searchTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 3,
  },
  activeSearchTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchTabText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  activeSearchTabText: {
    color: '#fff',
  },
  searchInputContainer: {
    flexDirection: 'row',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
}); 