
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ！！！【重要】！！！
// 以下の firebaseConfig オブジェクトを、ご自身のFirebaseプロジェクトの設定に置き換えてください。
// この設定は、Firebaseコンソールの「プロジェクトの設定」>「全般」タブの中の「マイアプリ」セクションにあります。
//
// また、このプロジェクトで「Cloud Firestore」データベースが作成されていることを確認してください。
// まだ作成していない場合は、Firebaseコンソールの「ビルド」>「Firestore Database」から作成できます。
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // "AIza..." で始まるキー
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID", // "1:..." で始まるID
  measurementId: "G-YOUR_MEASUREMENT_ID" // (任意)
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const db = getFirestore(app);