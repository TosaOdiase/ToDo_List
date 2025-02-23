import React, { useState, useRef, useCallback } from 'react';
import { Text, View, TextInput, FlatList, StyleSheet, TouchableOpacity, Platform, Animated, StatusBar } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_700Bold } from '@expo-google-fonts/inter';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';

export default function App() {
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState<Array<{ text: string; completed: boolean }>>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [swipedIndex, setSwipedIndex] = useState<number | null>(null);
  const [isTrashVisible, setIsTrashVisible] = useState(false);
  const [taskAnimatedValues] = useState(() => 
    new Map<number, Animated.Value>()
  );

  // Create a refs object to store Swipeable refs per item.
  const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({});

  const [fontsLoaded] = useFonts({
    'Inter-Bold': Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const getTaskAnimatedValue = useCallback((index: number) => {
    if (!taskAnimatedValues.has(index)) {
      taskAnimatedValues.set(index, new Animated.Value(0));
    }
    return taskAnimatedValues.get(index)!;
  }, [taskAnimatedValues]);

  const addTask = () => {
    if (task.trim()) {
      setTasks([...tasks, { text: task, completed: false }]);
      setTask("");
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
      setTasks([
        ...newTasks.filter(task => task.completed),
        ...newTasks.filter(task => !task.completed)
      ]);
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
    // First close any open swipeable
    if (swipedIndex !== null) {
      swipeableRefs.current[swipedIndex]?.close();
    }

    // Reset all states
    setDeleteConfirmIndex(null);
    setSwipedIndex(null);
    
    // Update tasks with animation
    const newTasks = tasks.filter((_, i) => i !== index);
    setTasks(newTasks);
    
    // Reset refs and clean up the deleted ref
    Object.keys(swipeableRefs.current).forEach((key) => {
      const keyNum = parseInt(key);
      if (keyNum > index) {
        // Move the ref to the new index
        swipeableRefs.current[keyNum - 1] = swipeableRefs.current[keyNum];
      }
    });
    delete swipeableRefs.current[index];
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
    if (swipedIndex !== null) {
      swipeableRefs.current[swipedIndex]?.reset();
    }
    setSwipedIndex(null);
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {showInput && (
        <TextInput
          style={styles.input}
          placeholder="Add new task"
          placeholderTextColor="#808080"
          value={task}
          onChangeText={setTask}
          returnKeyType="done"
          onSubmitEditing={() => {
            addTask();
            setShowInput(false);
          }}
          autoFocus
        />
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
              // Close any other open swipeables first
              if (swipedIndex !== null && swipedIndex !== index) {
                swipeableRefs.current[swipedIndex]?.close();
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onSwipeableRightOpen={() => {
              setSwipedIndex(index);
            }}
            onSwipeableClose={() => {
              setSwipedIndex(null);
            }}
          >
            <Animated.View style={[
              styles.taskContainer,
              {
                opacity: 1,
                transform: [{
                  translateY: getTaskAnimatedValue(index).interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -index * 44], // 44 is approximate height of task
                  })
                }]
              }
            ]}>
              <TouchableOpacity
                style={[
                  styles.checkButton,
                  item.completed && styles.checkButtonCompleted
                ]}
                onPress={() => toggleTask(index)}
              >
                {item.completed && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
              
              {editingIndex === index ? (
                <TextInput
                  style={[styles.task, styles.editInput]}
                  value={editingText}
                  onChangeText={setEditingText}
                  onBlur={() => saveEdit(index)}
                  onSubmitEditing={() => saveEdit(index)}
                  autoFocus
                />
              ) : (
                <TouchableOpacity
                  onPress={() => !item.completed && startEditing(index, item.text)}
                  style={styles.taskTextContainer}
                >
                  <Text style={[
                    styles.task,
                    item.completed && styles.completedTask
                  ]}>
                    {item.text}
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
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
    fontFamily: 'Inter-Bold',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
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
    color: "#000000",
    flex: 1,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#808080',
  },
  checkButton: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#808080',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonCompleted: {
    backgroundColor: '#808080',
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
    padding: 0,
    margin: 0,
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
    fontFamily: 'Inter-Bold',
    marginBottom: 20,
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
    fontFamily: 'Inter-Bold',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
  deleteButtonText: {
    color: '#FF4040',
    fontFamily: 'Inter-Bold',
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
});
