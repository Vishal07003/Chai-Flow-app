/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler, type RemoteMessage } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Register background handler for FCM messages when app is in background or terminated
const messagingInstance = getMessaging();
setBackgroundMessageHandler(messagingInstance, async (remoteMessage: RemoteMessage) => {
  console.log('[FCM Background Message]', remoteMessage.messageId);
});

AppRegistry.registerComponent(appName, () => App);
