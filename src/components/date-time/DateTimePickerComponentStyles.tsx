import deepmerge from 'deepmerge';
import { StyleSheet } from 'react-native';
import ResponsiveStylesSheet from 'react-native-responsive-stylesheet';
import { ScaledSheet } from 'react-native-size-matters';

import Utils from '../../utils/Utils';

export default function computeStyleSheet(): StyleSheet.NamedStyles<any> {
  const commonColor = Utils.getCurrentCommonColor();
  const commonStyles = ScaledSheet.create({
    dateTimeContent: {
      width: '100%',
      height: '90@s',
      justifyContent: 'space-between',
      flexDirection: 'row',
      margin: 0,
      paddingLeft: 0,
      paddingTop: 0,
      paddingBottom: 0,
      paddingRight: 0
    },
    avatarContainer: {
      marginLeft: '15@s',
      height: '100%',
      paddingRight: '15@s',
      alignItems: 'center',
      justifyContent: 'center'
    },
    dateTimeContainer: {
      flex: 1,
      height: '100%',
      flexDirection: 'column',
      justifyContent: 'center',
      paddingRight: '5@s'
    },
    text: {
      color: commonColor.textColor,
      fontSize: '13@s'
    },
    title: {
      fontSize: '14@s',
      width: '100%',
      fontWeight: 'bold'
    },
    bottomLine: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%'
    },
    dateTimeInputContainer: {
      flexDirection: 'row',
      width: '95%',
      alignItems: 'center',
      padding: '5@s'
    }
  });
  const portraitStyles = {};
  const landscapeStyles = {};
  return ResponsiveStylesSheet.createOriented({
    landscape: deepmerge(commonStyles, landscapeStyles) as StyleSheet.NamedStyles<any>,
    portrait: deepmerge(commonStyles, portraitStyles) as StyleSheet.NamedStyles<any>
  });
}
