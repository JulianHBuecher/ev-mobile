import React from 'react';
import { Icon } from 'native-base';

import I18n from 'i18n-js';
import { Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import I18nManager from '../../I18n/I18nManager';
import computeStyleSheet from './DateTimePickerComponentStyles';
import Utils from '../../utils/Utils';
import { scale } from 'react-native-size-matters';
import Foundation from 'react-native-vector-icons/Foundation';
import DateTimePicker from 'react-native-modal-datetime-picker';
import Message from '../../utils/Message';
import moment from 'moment';

export interface Props {
  title: string;
  dateTime?: Date;
  minimumDateTime?: Date;
  maximumDateTime?: Date;
  locale?: string;
  is24Hour?: boolean;
  containerStyle?: ViewStyle[];
  onDateTimeChanged: (newDateTime: Date) => Promise<void> | void;
}

interface State {
  value: Date;
  openDateTimePicker: boolean;
}

export default class DateTimePickerComponent extends React.Component<Props, State> {
  public props: Props;
  public state: State;

  public constructor(props: Props) {
    super(props);
    this.onConfirm.bind(this);
    this.state = {
      value: null,
      openDateTimePicker: false
    };
  }

  public setState = (
    state: State | ((prevState: Readonly<State>, props: Readonly<Props>) => State | Pick<State, never>) | Pick<State, never>,
    callback?: () => void
  ) => {
    super.setState(state, callback);
  };

  public canBeSaved() {
    return true;
  }

  public render() {
    const style = computeStyleSheet();
    const { title, dateTime, minimumDateTime, maximumDateTime, locale, is24Hour, containerStyle } = this.props;
    const commonColors = Utils.getCurrentCommonColor();
    return (
      <View style={[...(containerStyle || [])]}>
        <TouchableOpacity style={style.dateTimeContainer} onPress={() => this.setState({ openDateTimePicker: true })}>
          <View style={style.calendarIconContainer}>
            <Icon size={scale(28)} style={style.dateIcon} as={Foundation} name={'calendar'} />
          </View>
          <View style={style.contentContainer}>
            <Text numberOfLines={1} ellipsizeMode={'tail'} style={[style.text, style.title]}>
              {I18n.t(title)}
            </Text>
            <Text numberOfLines={1} style={style.text}>
              {I18nManager.formatDateTime(dateTime, { dateStyle: 'medium' })}
            </Text>
            <Text numberOfLines={1} style={style.text}>
              {I18nManager.formatDateTime(dateTime, { timeStyle: 'medium' })}
            </Text>
          </View>
        </TouchableOpacity>
        <DateTimePicker
          isVisible={this.state.openDateTimePicker}
          mode={'datetime'}
          locale={locale}
          is24Hour={is24Hour}
          cancelTextIOS={I18n.t('general.cancel')}
          confirmTextIOS={I18n.t('general.confirm')}
          buttonTextColorIOS={commonColors.textColor}
          minimumDate={minimumDateTime}
          maximumDate={maximumDateTime}
          date={dateTime}
          minuteInterval={5}
          onConfirm={(newDateTime: Date) => this.onConfirm(newDateTime)}
          onCancel={() => this.setState({ openDateTimePicker: false })}
        />
      </View>
    );
  }

  private onConfirm(newDateTime: Date) {
    const { onDateTimeChanged } = this.props;
    // Workaround to fix the bug from react-native-modal-datetime-picker
    newDateTime = this.fitDateWithinMinAndMax(newDateTime);
    this.setState({ openDateTimePicker: false, value: newDateTime }, () => onDateTimeChanged?.(newDateTime));
  }

  private fitDateWithinMinAndMax(date: Date): Date {
    const { maximumDateTime, minimumDateTime } = this.props;
    const parsedMinDateTime = moment(minimumDateTime);
    const parsedMaxDateTime = moment(maximumDateTime);
    if (date) {
      if (!parsedMinDateTime.isValid() && parsedMinDateTime.isAfter(date)) {
        Message.showError(I18n.t('reservations.invalidDateRange'));
        return minimumDateTime;
      } else if (!parsedMaxDateTime.isValid() && parsedMaxDateTime.isBefore(date)) {
        Message.showError(I18n.t('reservations.invalidDateRange'));
        return maximumDateTime;
      }
    }
    return date;
  }
}
