import React from 'react';
import { View, Text } from 'react-native';

export const Marker = ({ children }) => <View>{children}</View>;

const MapView = ({ children, style }) => (
    <View style={[style, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B' }]}>
        <Text style={{ color: '#9CA3AF', fontWeight: 'bold' }}>Interactive Map is not available on Web</Text>
        <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>Please use the list view or the mobile app.</Text>
    </View>
);

export default MapView;
