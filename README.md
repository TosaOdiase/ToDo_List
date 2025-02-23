TodoApp
A simple To-Do List mobile application built with React Native and Expo. This app demonstrates task management features such as adding, editing, completing, and deleting tasks—all with smooth animations and haptic feedback for an enhanced user experience.

Features
Task Management:

Add new tasks dynamically.
Mark tasks as completed with a simple tap.
Edit task text by tapping on an incomplete task.
Delete tasks via a swipe gesture with a confirmation modal.
Smooth Animations:

Utilizes React Native's Animated API to transition tasks when toggled.
Rearranges tasks with a neat animation effect.
Haptic Feedback:

Provides tactile responses using Expo Haptics, enhancing the interactive experience.
Custom Fonts:

Loads the Inter font from Google Fonts via Expo for a modern look.
Cross-Platform:

Designed to work seamlessly on both iOS and Android devices.
Installation
Prerequisites
Node.js (LTS version recommended)
Expo CLI installed globally
bash
Copy
npm install -g expo-cli
A package manager such as npm or yarn
Setup
Clone the Repository:

bash
Copy
git clone https://github.com/your-username/todoapp.git
cd todoapp
Install Dependencies:

Using npm:

bash
Copy
npm install
Or using yarn:

bash
Copy
yarn install
Start the Application:

bash
Copy
expo start
Follow the instructions in the terminal to run the app on an emulator or a physical device.

Code Overview
The main application logic is contained in the App.js file. Key aspects include:

State Management & Hooks:
Uses React's useState and useCallback hooks to manage tasks, editing state, and animated values.

Task Animations:
Implements smooth transitions using React Native's Animated API. Each task is animated when toggled between completed and active states.

Swipeable Actions:
Integrates react-native-gesture-handler’s Swipeable component to allow swipe-to-delete functionality. Users receive haptic feedback when interacting with tasks.

Custom Fonts & Styling:
Loads custom fonts using Expo's useFonts hook, and styles are defined using React Native's StyleSheet for a consistent design.

Platform-Specific Feedback:
Provides haptic feedback tailored for iOS (and available on Android) using Expo Haptics.

Contributing
Contributions, issues, and feature requests are welcome! Feel free to check issues page if you want to contribute.

Fork the repository.
Create your feature branch (git checkout -b feature/YourFeature).
Commit your changes (git commit -m 'Add some feature').
Push to the branch (git push origin feature/YourFeature).
Open a pull request.
License
Distributed under the MIT License. See the LICENSE file for details.

Acknowledgements
Expo
React Native
React Native Gesture Handler
Feather Icons
Google Fonts
