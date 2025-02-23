import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Text, View, TextInput, FlatList, StyleSheet, TouchableOpacity, Platform, Animated, StatusBar } from 'react-native';
import { useFonts } from 'expo-font';
import { 
  Poppins_400Regular,
  Poppins_600SemiBold 
} from '@expo-google-fonts/poppins';
import { DellaRespira_400Regular } from '@expo-google-fonts/della-respira';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Add this near the top of the file, after imports
interface Tag {
  text: string;
  color: string;
}

// Add this helper function after the Tag interface and before the component
const levenshteinDistance = (str1: string, str2: string): number => {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator,
      );
    }
  }
  return track[str2.length][str1.length];
};

// Outside component:
const taskAnimatedValues = new Map<number, Animated.Value>();

// Add this helper function after your other functions
const isDatePast = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);  // Reset time to start of day
  return date < today;
};

// Add this helper function to sort tasks
const sortTasks = (tasks: Array<{ 
  text: string; 
  completed: boolean; 
  dueDate?: Date;
}>) => {
  return [...tasks].sort((a, b) => {
    // First sort by completion status
    if (a.completed !== b.completed) {
      return a.completed ? -1 : 1;
    }
    
    // If neither task has a due date
    if (!a.dueDate && !b.dueDate) {
      return 0;
    }
    
    // Put tasks without due dates at the bottom
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    
    // Sort by date (earliest first) for uncompleted tasks
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
};

export default function App() {
  // 1. Font loading hook
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'DellaRespira': DellaRespira_400Regular,
  });

  // 2. All useState hooks
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState<Array<{ 
    text: string; 
    completed: boolean;
    dueDate?: Date;
  }>>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [swipedIndex, setSwipedIndex] = useState<number | null>(null);
  const [isTrashVisible, setIsTrashVisible] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [currentTagText, setCurrentTagText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [suggestedDate, setSuggestedDate] = useState<Date | null>(null);
  const [showDateSuggestion, setShowDateSuggestion] = useState(false);
  const [highlightedText, setHighlightedText] = useState('');

  // 3. All useRef hooks
  const inputRef = useRef<TextInput>(null);
  const lastCursorPosition = useRef<number>(0);
  const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({});

  // 4. All useCallback hooks
  const getTaskAnimatedValue = useCallback((index: number) => {
    if (!taskAnimatedValues.has(index)) {
      taskAnimatedValues.set(index, new Animated.Value(0));
    }
    return taskAnimatedValues.get(index)!;
  }, []);

  // 5. All useMemo hooks
  const filteredTags = useMemo(() => {
    if (!currentTagText) return tags;
    return tags
      .filter(tag => tag.text.toLowerCase().includes(currentTagText.toLowerCase()))
      .sort((a, b) => {
        const aSimilarity = levenshteinDistance(currentTagText, a.text);
        const bSimilarity = levenshteinDistance(currentTagText, b.text);
        return aSimilarity - bSimilarity;
      });
  }, [currentTagText, tags]);

  // Early return for font loading
  if (!fontsLoaded) {
    return null;
  }

  const addTask = () => {
    if (task.trim()) {
      const newTasks = [...tasks, { 
        text: task, 
        completed: false,
        dueDate: suggestedDate || undefined
      }];
      setTasks(sortTasks(newTasks));
      setTask("");
      setShowDateSuggestion(false);
      setSuggestedDate(null);
    }
  };

  const toggleTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks[index].completed = !newTasks[index].completed;
    
    // Animate the task position
    Animated.timing(getTaskAnimatedValue(index), {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Reset animation value and update task order
      getTaskAnimatedValue(index).setValue(0);
      setTasks(sortTasks(newTasks));
    });
  };

  const startEditing = (index: number, text: string) => {
    setEditingIndex(index);
    setEditingText(text);
  };

  const saveEdit = (index: number) => {
    if (editingText.trim()) {
      const newTasks = [...tasks];
      newTasks[index].text = editingText.trim();
      setTasks(newTasks);
    }
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    setTasks(newTasks);
    setDeleteConfirmIndex(null);
  };

  const onScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    if (scrollY < -50 && !showInput) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setShowInput(true);
    } else if (scrollY > 0) {
      setShowInput(false);
    }
  };

  const handleCancel = () => {
    setDeleteConfirmIndex(null);
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    index: number
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-180, -100, -50, 0],  // Extended range for further swipe
      outputRange: [-15, -15, -15, 0],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [-50, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActions}>
        <Animated.View style={[
          styles.trashButton, 
          { 
            transform: [{ translateX: trans }],
            opacity 
          }
        ]}>
          <TouchableOpacity 
            onPress={() => {
              handleDelete(index);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onLongPress={() => {
              setDeleteConfirmIndex(index);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Feather name="trash-2" size={24} color="black" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (event.type === 'set' && date && selectedTaskIndex !== null) {
      const newTasks = [...tasks];
      newTasks[selectedTaskIndex].dueDate = date;
      setTasks(sortTasks(newTasks));
    }
    setShowDatePicker(false);
    setSelectedTaskIndex(null);
  };

  const handleTaskLongPress = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTaskIndex(index);
    setSelectedDate(tasks[index].dueDate || new Date());
    setShowDatePicker(true);
  };

  const checkForDateKeywords = (text: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for tomorrow keywords
    const tomorrowKeywords = ['tomorrow', 'tmrw', 'tmwr'];
    const foundTomorrow = tomorrowKeywords.find(keyword => 
      text.toLowerCase().includes(keyword)
    );

    // Check for today keywords
    const todayKeywords = ['today', 'tdy', 'td'];
    const foundToday = todayKeywords.find(keyword => 
      text.toLowerCase().includes(keyword)
    );

    if (foundTomorrow) {
      setSuggestedDate(tomorrow);
    } else if (foundToday) {
      setSuggestedDate(today);
    } else {
      setSuggestedDate(null);
    }
  };

  const handleTextChange = (text: string) => {
    setTask(text);
    checkForDateKeywords(text);
  };

  const handleDateSuggestionSelect = () => {
    if (suggestedDate) {
      const newTasks = [...tasks, { 
        text: task, 
        completed: false,
        dueDate: suggestedDate
      }];
      setTasks(sortTasks(newTasks));
      setTask("");
      setShowDateSuggestion(false);
      setSuggestedDate(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {showInput && (
        <View>
          <TextInput
            style={styles.input}
            value={task}
            onChangeText={handleTextChange}
            placeholder="Add new task"
            placeholderTextColor="#808080"
            returnKeyType="done"
            onSubmitEditing={() => {
              addTask();
              setShowInput(false);
            }}
            autoFocus
          />
        </View>
      )}
      <FlatList
        data={tasks}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Swipeable
            ref={(ref) => (swipeableRefs.current[index] = ref)}
            enabled={deleteConfirmIndex === null}
            renderRightActions={(progress, dragX) =>
              renderRightActions(progress, dragX, index)
            }
            rightThreshold={50}
            friction={2}
            overshootRight={false}
            onSwipeableWillOpen={() => {
              if (swipedIndex !== null && swipedIndex !== index) {
                swipeableRefs.current[swipedIndex]?.close();
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onSwipeableRightOpen={() => setSwipedIndex(index)}
            onSwipeableClose={() => setSwipedIndex(null)}
          >
            <View style={styles.taskContainer}>
              <TouchableOpacity
                style={[
                  styles.checkButton,
                  item.completed && styles.checkButtonCompleted
                ]}
                onPress={() => toggleTask(index)}
              >
                {item.completed && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => !item.completed && startEditing(index, item.text)}
                onLongPress={() => handleTaskLongPress(index)}
                style={styles.taskTextContainer}
              >
                <View style={styles.taskContent}>
                  <Text style={[
                    styles.task,
                    item.completed && styles.completedTask,
                    item.dueDate && isDatePast(item.dueDate) && styles.pastDueTask
                  ]}>
                    {item.text}
                  </Text>
                  {item.dueDate && (
                    <Text style={[
                      styles.dateText,
                      item.completed && styles.completedTask,
                      isDatePast(item.dueDate) && styles.pastDueTask
                    ]}>
                      {item.dueDate.toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDeleteConfirmIndex(index);
                }}
              >
                <Feather name="more-horizontal" size={24} color="#2F2F2F" />
              </TouchableOpacity>
            </View>
          </Swipeable>
        )}
        keyExtractor={(_item, index) => index.toString()}
      />

      {deleteConfirmIndex !== null && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Feather name="trash-2" size={32} color="black" />
            </View>
            <Text style={styles.modalTitle}>Do you want to delete?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteButton]}
                onPress={() => handleDelete(deleteConfirmIndex)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showDatePicker && (
        <TouchableOpacity 
          style={styles.datePickerOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDatePicker(false);
            setSelectedTaskIndex(null);
          }}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
            style={styles.datePickerContainer}
          >
            <Text style={styles.datePickerTitle}>Add date</Text>
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="inline"
              onChange={handleDateChange}
              style={styles.datePicker}
              textColor="black"
              accentColor="#5D9CEC"
              themeVariant="light"
            />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F5F2",
  },
  listContent: {
    padding: 25,
    paddingTop: 150,
  },
  input: {
    padding: 15,
    marginHorizontal: 25,
    marginTop: 60,
    backgroundColor: "#F7F5F2",
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
    color: '#2F2F2F',
  },
  taskContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  task: {
    fontSize: 18,
    padding: 5,
    color: "#2F2F2F",
    flex: 1,
    fontFamily: 'Poppins-Regular',
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#808080',
  },
  checkButton: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2F2F2F',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonCompleted: {
    backgroundColor: '#2F2F2F',
  },
  checkMark: {
    color: '#F7F5F2',
    fontSize: 16,
  },
  taskTextContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  editInput: {
    padding: 5,
    marginLeft: 10,
    fontSize: 18,
    flex: 1,
  },
  deleteSwipeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    position: 'absolute',
    right: 0,
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 20,
    color: '#2F2F2F',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#666666',
    fontFamily: 'Poppins-Regular',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
  deleteButtonText: {
    color: '#FF4040',
    fontFamily: 'Poppins-Regular',
  },
  rightActions: {
    width: 60,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  trashButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 50,
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  datePickerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 20,
    color: '#2F2F2F',
  },
  datePicker: {
    width: 320,
    height: 400,
    backgroundColor: 'white',
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#808080',
    marginLeft: 10,
    fontFamily: 'Poppins-Regular',
  },
  pastDueTask: {
    color: '#FF7070',  // Lighter, more subtle red color
  },
  highlightedText: {
    color: '#4682B4',  // Steel blue color
  },
  menuButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

