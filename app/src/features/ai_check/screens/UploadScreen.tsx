import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function UploadScreen() {
    return (
        <View style={styles.container}>
            <Text>Please upload a photo of your teeth.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
