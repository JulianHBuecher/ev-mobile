import I18n from 'i18n-js';
import { Icon } from 'native-base';
import React from 'react';
import { View } from 'react-native';
import { Button, CheckBox, Input } from 'react-native-elements';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Orientation from 'react-native-orientation-locker';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelectDropdown from 'react-native-select-dropdown';
import { scale } from 'react-native-size-matters';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import computeFormStyleSheet from '../../FormStyles';
import I18nManager from '../../I18n/I18nManager';
import CarComponent from '../../components/car/CarComponent';
import DateTimePickerComponent from '../../components/date-time/DateTimePickerComponent';
import HeaderComponent from '../../components/header/HeaderComponent';
import { ItemSelectionMode } from '../../components/list/ItemsList';
import ModalSelect from '../../components/modal/ModalSelect';
import TagComponent from '../../components/tag/TagComponent';
import UserComponent from '../../components/user/UserComponent';
import BaseScreen from '../../screens/base-screen/BaseScreen';
import Users from '../../screens/users/list/Users';
import { RestResponse } from '../../types/ActionResponse';
import BaseProps from '../../types/BaseProps';
import Car from '../../types/Car';
import ChargingStation, { ChargePointStatus, Connector } from '../../types/ChargingStation';
import Reservation, { ReservationType } from '../../types/Reservation';
import Tag from '../../types/Tag';
import { UserSessionContext } from '../../types/Transaction';
import User, { UserRole, UserStatus } from '../../types/User';
import UserToken from '../../types/UserToken';
import Message from '../../utils/Message';
import Utils from '../../utils/Utils';
import computeStyleSheet from './AddReservationStyles';
import Tags from '../../screens/tags/Tags';
import Cars from '../../screens/cars/Cars';
import ReservableChargingStations from '../../screens/charging-stations/list/ReservableChargingStations';
import moment from 'moment';
import ReservableChargingStationComponent from '../../components/charging-station/ReservableChargingStationComponent';

interface State {
  reservableChargingStations: ChargingStation[];
  selectedChargingStation: ChargingStation;
  selectedConnector: Connector;
  selectedUser: User;
  sessionContext: UserSessionContext;
  selectedTag: Tag;
  expiryDate: Date;
  fromDate: Date;
  toDate: Date;
  selectedParentTag?: Tag;
  selectedCar?: Car;
  reservationID: number;
  type: ReservationType;
  sessionContextLoading?: boolean;
  refreshing?: boolean;
  isAdmin?: boolean;
  isSiteAdmin?: boolean;
  alreadyReserved?: boolean;
}

export interface Props extends BaseProps {}

export default class AddReservation extends BaseScreen<Props, State> {
  public state: State;
  public props: Props;
  private currentUser: UserToken;

  public constructor(props: Props) {
    super(props);
    this.state = {
      reservationID: null,
      reservableChargingStations: null,
      selectedChargingStation: null,
      selectedConnector: null,
      selectedUser: null,
      selectedTag: null,
      selectedCar: null,
      expiryDate: null,
      fromDate: null,
      toDate: null,
      type: null,
      refreshing: false,
      isAdmin: false,
      isSiteAdmin: false,
      sessionContext: null,
      sessionContextLoading: true,
      alreadyReserved: false
    };
  }

  public async componentDidMount(): Promise<void> {
    await super.componentDidMount();
    Orientation.lockToPortrait();
    this.currentUser = this.centralServerProvider.getUserInfo();
    const selectedUser = Utils.getParamFromNavigation(this.props.route, 'user', null) as unknown as User;
    const selectedTag = Utils.getParamFromNavigation(this.props.route, 'tag', null) as unknown as Tag;
    const selectedChargingStation = Utils.getParamFromNavigation(this.props.route, 'chargingStation', null) as unknown as ChargingStation;
    const selectedConnector = Utils.getParamFromNavigation(this.props.route, 'connector', null) as unknown as Connector;
    const currentUser = {
      id: this.currentUser?.id,
      firstName: this.currentUser?.firstName,
      name: this.currentUser?.name,
      status: UserStatus.ACTIVE,
      role: this.currentUser.role,
      email: this.currentUser.email
    } as User;
    const alreadyReserved = selectedConnector?.status === ChargePointStatus.RESERVED;
    this.setState(
      {
        type: alreadyReserved ? ReservationType.PLANNED_RESERVATION : ReservationType.RESERVE_NOW, // as default
        selectedUser: selectedUser ?? (currentUser.role === UserRole.ADMIN ? null : this.currentUser),
        selectedTag,
        selectedChargingStation,
        selectedConnector,
        fromDate: moment().toDate(),
        toDate: moment().add(1, 'd').toDate(),
        reservationID: Utils.generateRandomReservationID(),
        expiryDate: Utils.generateDateWithDelay(0, 1, 0, 0),
        alreadyReserved: alreadyReserved ?? false
      },
      async () => await this.loadUserSessionContext()
    );
  }

  public componentWillUnmount(): void {
    super.componentWillUnmount();
    Orientation.unlockAllOrientations();
  }

  public render() {
    const { navigation } = this.props;
    const {
      selectedChargingStation,
      selectedConnector,
      selectedUser,
      selectedTag,
      selectedCar,
      type,
      expiryDate,
      fromDate,
      toDate,
      sessionContextLoading,
      alreadyReserved
    } = this.state;
    const commonColors = Utils.getCurrentCommonColor();
    const style = computeStyleSheet();
    const formStyle = computeFormStyleSheet();
    return (
      <SafeAreaView edges={['bottom']} style={style.container}>
        <HeaderComponent
          title={I18n.t('reservations.create.title')}
          navigation={navigation}
          backArrow={true}
          containerStyle={style.headerContainer}
        />
        <KeyboardAwareScrollView
          bounces={false}
          persistentScrollbar={true}
          contentContainerStyle={formStyle.scrollViewContentContainer}
          keyboardShouldPersistTaps={'handled'}
          style={formStyle.scrollView}>
          {type === ReservationType.RESERVE_NOW && (
            <View style={[formStyle.inputContainer]}>
              <View style={[formStyle.inputTextContainer, formStyle.inputText, { paddingLeft: 0 }]}>
                {this.renderDatePicker(
                  'reservations.expiryDate',
                  (newExpiryDate: Date) => this.setState({ expiryDate: newExpiryDate }),
                  expiryDate
                )}
              </View>
            </View>
          )}
          {type === ReservationType.PLANNED_RESERVATION && (
            <View style={[formStyle.inputContainer]}>
              <View style={[formStyle.inputTextContainer, formStyle.inputText, { paddingLeft: 0 }]}>
                {this.renderDatePicker(
                  'reservations.fromDate',
                  (newFromDate: Date) => this.setState({ fromDate: newFromDate }),
                  fromDate,
                  null,
                  toDate
                )}
              </View>
            </View>
          )}
          {type === ReservationType.PLANNED_RESERVATION && (
            <View style={[formStyle.inputContainer]}>
              <View style={[formStyle.inputTextContainer, formStyle.inputText, { paddingLeft: 0 }]}>
                {this.renderDatePicker('reservations.toDate', (newToDate: Date) => this.setState({ toDate: newToDate }), toDate, fromDate)}
              </View>
            </View>
          )}
          <View style={[formStyle.inputContainer]}>
            <View style={[formStyle.inputTextContainer, selectedChargingStation && { paddingLeft: 0 }]}>
              <ModalSelect<ChargingStation>
                openable={true}
                disabled={!(!!this.state.expiryDate || (!!this.state.fromDate && !!this.state.toDate))}
                defaultItems={[selectedChargingStation]}
                renderItemPlaceholder={() => this.renderChargingStationPlaceholder(style)}
                renderItem={(chargingStation: ChargingStation) => this.renderChargingStation(style, chargingStation)}
                onItemsSelected={(chargingStations: ChargingStation[]) => this.onChargingStationSelected(chargingStations?.[0])}
                navigation={navigation}
                selectionMode={ItemSelectionMode.SINGLE}>
                <ReservableChargingStations
                  filters={{
                    issuer: true,
                    WithSite: true,
                    WithSiteArea: true,
                    fromDate: this.state.fromDate ?? moment().toDate(),
                    toDate: this.state.toDate ?? this.state.expiryDate ?? moment().add(1, 'd').toDate()
                  }}
                  navigation={navigation}
                />
              </ModalSelect>
            </View>
          </View>
          <View style={[formStyle.inputContainer]}>
            <View style={[formStyle.inputTextContainer]}>
              <SelectDropdown
                disabled={!selectedChargingStation}
                defaultValue={selectedConnector}
                statusBarTranslucent={true}
                defaultButtonText={I18n.t('reservations.connectorId')}
                data={selectedChargingStation?.connectors.filter((connector) => connector.status !== ChargePointStatus.UNAVAILABLE)}
                buttonTextAfterSelection={(connector: Connector) => this.buildChargingStationConnectorName(connector)}
                rowTextForSelection={(connector: Connector) => this.buildChargingStationConnectorName(connector)}
                buttonStyle={{ ...style.selectField, ...(!selectedConnector ? style.selectFieldDisabled : {}) }}
                buttonTextStyle={{ ...style.selectFieldText, ...(!selectedConnector ? style.selectFieldTextPlaceholder : {}) }}
                dropdownStyle={style.selectDropDown}
                rowStyle={style.selectDropDownRow}
                rowTextStyle={style.selectDropdownRowText}
                renderDropdownIcon={() => <Icon size={scale(25)} style={style.dropdownIcon} as={MaterialIcons} name={'arrow-drop-down'} />}
                onSelect={(connector: Connector) => this.setState({ selectedConnector: connector })}
              />
            </View>
          </View>
          {this.securityProvider?.canListUsers() && (
            <View style={[formStyle.inputContainer]}>
              <View style={[formStyle.inputTextContainer, selectedUser && { paddingLeft: 0 }]}>
                <ModalSelect<User>
                  openable={true}
                  disabled={false}
                  defaultItems={[selectedUser]}
                  renderItem={(user: User) => this.renderUser(style, user)}
                  renderItemPlaceholder={() => this.renderUserPlaceholder(style)}
                  onItemsSelected={this.onUserSelected.bind(this)}
                  navigation={navigation}
                  selectionMode={ItemSelectionMode.SINGLE}>
                  <Users filters={{ issuer: true }} navigation={navigation} />
                </ModalSelect>
              </View>
            </View>
          )}
          {this.securityProvider?.canListTags() && (
            <View style={[formStyle.inputContainer]}>
              <View style={[formStyle.inputTextContainer, selectedTag && { paddingLeft: 0 }]}>
                <ModalSelect<Tag>
                  openable={true}
                  disabled={false}
                  defaultItems={[selectedTag]}
                  renderItem={(tag: Tag) => this.renderTag(style, tag)}
                  renderItemPlaceholder={() => this.renderTagPlaceholder(style)}
                  onItemsSelected={(tags: Tag[]) => this.setState({ selectedTag: tags?.[0] }, () => void this.loadUserSessionContext())}
                  navigation={navigation}
                  defaultItemLoading={sessionContextLoading}
                  selectionMode={ItemSelectionMode.SINGLE}>
                  <Tags disableInactive={true} sorting={'-active'} userIDs={[selectedUser?.id as string]} navigation={navigation} />
                </ModalSelect>
              </View>
            </View>
          )}
          {this.securityProvider?.isComponentCarActive() && (
            <View style={[formStyle.inputContainer]}>
              <View style={[formStyle.inputTextContainer, selectedCar && { paddingLeft: 0 }]}>
                <ModalSelect<Car>
                  openable={true}
                  disabled={false}
                  defaultItems={[selectedCar]}
                  renderItemPlaceholder={() => this.renderCarPlaceholder(style)}
                  renderItem={(car) => <CarComponent car={car} navigation={navigation} />}
                  onItemsSelected={(cars: Car[]) => this.setState({ selectedCar: cars?.[0] }, () => void this.loadUserSessionContext())}
                  defaultItemLoading={sessionContextLoading}
                  navigation={navigation}
                  selectionMode={ItemSelectionMode.SINGLE}>
                  <Cars userIDs={[selectedUser?.id as string]} navigation={navigation} />
                </ModalSelect>
              </View>
            </View>
          )}
          {!alreadyReserved && (
            <View style={style.reservationTypeContainer}>
              <CheckBox
                containerStyle={formStyle.checkboxContainer}
                textStyle={formStyle.checkboxText}
                checked={type === ReservationType.RESERVE_NOW}
                checkedIcon={<Icon size={scale(25)} color={commonColors.textColor} name="radiobox-marked" as={MaterialCommunityIcons} />}
                uncheckedIcon={<Icon size={scale(25)} color={commonColors.textColor} name="radiobox-blank" as={MaterialCommunityIcons} />}
                onPress={() =>
                  this.setState({
                    type: ReservationType.RESERVE_NOW,
                    expiryDate: moment().add(1, 'h').toDate(),
                    fromDate: null,
                    toDate: null
                  })
                }
                title={I18n.t('reservations.types.reserve_now')}
              />
              <CheckBox
                containerStyle={formStyle.checkboxContainer}
                textStyle={formStyle.checkboxText}
                checked={type === ReservationType.PLANNED_RESERVATION}
                checkedIcon={<Icon size={scale(25)} color={commonColors.textColor} name="radiobox-marked" as={MaterialCommunityIcons} />}
                uncheckedIcon={<Icon size={scale(25)} color={commonColors.textColor} name="radiobox-blank" as={MaterialCommunityIcons} />}
                onPress={() =>
                  this.setState({
                    type: ReservationType.PLANNED_RESERVATION,
                    expiryDate: null,
                    fromDate: moment().toDate(),
                    toDate: moment().add(1, 'h').toDate()
                  })
                }
                title={I18n.t('reservations.types.planned_reservation')}
              />
            </View>
          )}
          <Button
            title={I18n.t('reservations.create.title')}
            titleStyle={formStyle.buttonTitle}
            disabled={!this.checkForm()}
            disabledStyle={formStyle.buttonDisabled}
            disabledTitleStyle={formStyle.buttonTextDisabled}
            containerStyle={formStyle.buttonContainer}
            buttonStyle={formStyle.button}
            loadingProps={{ color: commonColors.light }}
            onPress={() => void this.addReservation()}
          />
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  public async addReservation(): Promise<void> {
    if (this.checkForm()) {
      const {
        reservationID,
        selectedChargingStation,
        selectedConnector,
        selectedTag,
        selectedParentTag,
        selectedCar,
        expiryDate,
        fromDate,
        toDate,
        type
      } = this.state;
      try {
        const reservation: Reservation = {
          id: reservationID,
          chargingStationID: selectedChargingStation.id,
          connectorID: selectedConnector.connectorId,
          idTag: (selectedTag?.id as string) ?? null,
          visualTagID: selectedTag.visualID,
          fromDate: fromDate ?? new Date(),
          toDate: toDate ?? expiryDate,
          expiryDate: toDate ?? expiryDate,
          carID: (selectedCar?.id as string) ?? null,
          parentIdTag: selectedParentTag?.visualID ?? null,
          type,
          createdBy: { id: this.currentUser.id, name: this.currentUser.name, firstName: this.currentUser.firstName },
          createdOn: new Date()
        };
        // Create Reservation
        const response = await this.centralServerProvider.createReservation(reservation);
        if (response?.status === RestResponse.SUCCESS) {
          Message.showSuccess(
            I18n.t('reservations.create.success', {
              reservationID
            })
          );
          const routes = this.props.navigation.getState().routes;
          this.props.navigation.navigate(routes[Math.max(0, routes.length - 2)].name, { refresh: true });
          return;
        }
      } catch (error) {
        // Enable the button
        this.setState({ buttonDisabled: false });
        // Handle reservation return
        if (Utils.handleReservationResponses(error)) {
          return;
        }
        // Other common Error
        await Utils.handleHttpUnexpectedError(this.centralServerProvider, error, 'reservations.create.error', this.props.navigation);
      }
    }
  }

  public renderDatePicker(
    title: string,
    onDateTimeChanged: (newDate: Date) => Promise<void> | void,
    date: Date,
    minDate?: Date,
    maxDate?: Date
  ) {
    const minimumDate = minDate ?? moment().toDate();
    const maximumDate = maxDate ?? null;
    date = date ?? Utils.generateDateWithDelay(0, 1, 0, 0);
    const locale = this.currentUser?.locale;
    const is24Hour = I18nManager?.isLocale24Hour(locale);
    return (
      <DateTimePickerComponent
        title={title}
        locale={locale}
        is24Hour={is24Hour}
        minimumDateTime={minimumDate}
        maximumDateTime={maximumDate}
        dateTime={date}
        onDateTimeChanged={onDateTimeChanged}
      />
    );
  }

  public renderChargingStation(style: any, chargingStation: ChargingStation) {
    return (
      <SelectDropdown
        disabled={true}
        data={[]}
        defaultValue={null}
        renderCustomizedButtonChild={() => <ReservableChargingStationComponent chargingStation={chargingStation} navigation={null} />}
        buttonStyle={style.selectField}
        buttonTextStyle={style.selectFieldText}
        renderDropdownIcon={() => <Icon size={scale(25)} as={MaterialIcons} style={style.dropdownIcon} name={'arrow-drop-down'} />}
      />
    );
  }

  private checkForm(): boolean {
    const { reservationID, selectedChargingStation, selectedConnector, selectedUser, selectedTag, expiryDate, fromDate, toDate, type } =
      this.state;
    let valid = false;
    if (type === ReservationType.RESERVE_NOW) {
      valid =
        !!reservationID &&
        !!selectedChargingStation &&
        !!selectedConnector &&
        !!selectedUser &&
        !!selectedTag &&
        this.checkDate(expiryDate) &&
        !!type;
    } else {
      valid =
        !!reservationID &&
        !!selectedChargingStation &&
        !!selectedConnector &&
        !!selectedUser &&
        !!selectedTag &&
        this.checkDateRange(fromDate, toDate) &&
        !!type;
    }
    return valid;
  }

  private renderUserPlaceholder(style: any) {
    return (
      <SelectDropdown
        disabled={true}
        data={[]}
        statusBarTranslucent={true}
        defaultButtonText={I18n.t('users.user')}
        defaultValue={null}
        buttonStyle={style.selectField}
        buttonTextStyle={{ ...style.selectFieldText, ...(!this.state.selectedUser ? style.selectFieldTextPlaceholder : {}) }}
        renderDropdownIcon={() => <Icon style={style.dropdownIcon} size={scale(25)} as={MaterialIcons} name={'arrow-drop-down'} />}
      />
    );
  }

  private renderUser(style: any, user: User) {
    return (
      <SelectDropdown
        disabled={true}
        data={[]}
        defaultValue={null}
        renderCustomizedButtonChild={() => <UserComponent user={user} navigation={null} />}
        buttonStyle={style.selectField}
        buttonTextStyle={style.selectFieldText}
        renderDropdownIcon={() => <Icon size={scale(25)} as={MaterialIcons} style={style.dropdownIcon} name={'arrow-drop-down'} />}
      />
    );
  }

  private renderTagPlaceholder(style: any) {
    return (
      <SelectDropdown
        disabled={true}
        data={[]}
        statusBarTranslucent={true}
        defaultButtonText={I18n.t('tags.tag')}
        defaultValue={null}
        buttonStyle={style.selectField}
        buttonTextStyle={{ ...style.selectFieldText, ...(!this.state.selectedTag ? style.selectFieldTextPlaceholder : {}) }}
        renderDropdownIcon={() => <Icon style={style.dropdownIcon} size={scale(25)} as={MaterialIcons} name={'arrow-drop-down'} />}
      />
    );
  }

  private renderTag(style: any, tag: Tag) {
    return (
      <SelectDropdown
        disabled={true}
        data={[]}
        defaultValue={null}
        renderCustomizedButtonChild={() => <TagComponent tag={tag} navigation={null} />}
        buttonStyle={style.selectField}
        buttonTextStyle={style.selectFieldText}
        renderDropdownIcon={() => <Icon size={scale(25)} as={MaterialIcons} style={style.dropdownIcon} name={'arrow-drop-down'} />}
      />
    );
  }

  private renderCarPlaceholder(style: any) {
    return (
      <SelectDropdown
        disabled={true}
        data={[]}
        statusBarTranslucent={true}
        defaultButtonText={I18n.t('cars.car')}
        defaultValue={null}
        buttonStyle={style.selectField}
        buttonTextStyle={{ ...style.selectFieldText, ...(!this.state.selectedCar ? style.selectFieldTextPlaceholder : {}) }}
        renderDropdownIcon={() => <Icon style={style.dropdownIcon} size={scale(25)} as={MaterialIcons} name={'arrow-drop-down'} />}
      />
    );
  }

  private renderChargingStationPlaceholder(style: any) {
    return (
      <SelectDropdown
        disabled={true}
        data={[]}
        statusBarTranslucent={true}
        defaultButtonText={I18n.t('chargers.charger')}
        defaultValue={null}
        buttonStyle={style.selectField}
        buttonTextStyle={{ ...style.selectFieldText, ...(!this.state.selectedChargingStation ? style.selectFieldTextPlaceholder : {}) }}
        renderDropdownIcon={() => <Icon style={style.dropdownIcon} size={scale(25)} as={MaterialIcons} name={'arrow-drop-down'} />}
      />
    );
  }

  private onChargingStationSelected(selectedChargingStation: ChargingStation) {
    this.setState({ selectedChargingStation });
    this.loadChargingStationConnector(selectedChargingStation);
  }

  private loadChargingStationConnector(selectedChargingStation: ChargingStation) {
    let connector: Connector = null;
    if (selectedChargingStation.connectors.length === 1 && selectedChargingStation.connectors[0].status === ChargePointStatus.AVAILABLE) {
      connector = selectedChargingStation.connectors[0];
    }
    this.setState({
      selectedConnector: connector
    });
  }

  private async loadUserSessionContext(): Promise<void> {
    const { selectedUser, selectedChargingStation, selectedConnector } = this.state;
    let { selectedCar, selectedTag } = this.state;
    if (!selectedChargingStation || !selectedConnector) {
      this.setState({
        sessionContextLoading: false
      });
      return;
    }
    this.setState({ sessionContextLoading: true }, async () => {
      const userSessionContext = await this.getUserSessionContext(
        selectedUser?.id as string,
        selectedChargingStation?.id,
        selectedConnector?.connectorId,
        selectedCar?.id,
        selectedTag?.id
      );
      selectedCar = userSessionContext?.car ? { ...userSessionContext.car, user: selectedUser } : null;
      selectedTag = userSessionContext?.tag;
      this.setState({
        selectedCar,
        selectedTag,
        sessionContextLoading: false
      });
    });
  }

  private async getUserSessionContext(
    userID: string,
    chargingStationID: string,
    connectorID: number,
    carID: string,
    tagID: string
  ): Promise<UserSessionContext> {
    try {
      return await this.centralServerProvider.getUserSessionContext(userID, chargingStationID, connectorID, carID, tagID);
    } catch (error) {
      await Utils.handleHttpUnexpectedError(this.centralServerProvider, error, null, this.props.navigation);
      return null;
    }
  }

  private onUserSelected(selectedUsers: User[]): void {
    const selectedUser = selectedUsers?.[0];
    this.setState(
      {
        selectedUser,
        selectedCar: null,
        selectedTag: null,
        sessionContext: null
      },
      () => {
        void this.loadUserSessionContext();
      }
    );
  }

  private buildChargingStationConnectorName(connector: Connector): string {
    let connectorName = '';
    if (!connector) {
      return '-';
    }
    connectorName += `${I18n.t('reservations.connectorId')} ${Utils.getConnectorLetterFromConnectorID(connector.connectorId)}`;
    if (connector?.type && connector?.status) {
      connectorName += ` - ${Utils.translateConnectorType(connector?.type)}`;
    }
    if (connector?.amperage > 0) {
      connectorName += ` - ${connector.amperage} A`;
    }
    return connectorName;
  }

  private checkDate(date: Date): boolean {
    const parsedDate = moment(date);
    return !date || parsedDate.isValid();
  }

  private checkDateRange(minDate: Date, maxDate: Date) {
    let valid = false;
    const parsedMinDate = moment(minDate);
    const parsedMaxDate = moment(maxDate);
    if (parsedMinDate.isValid() || parsedMaxDate.isValid()) {
      valid = true;
    }
    if (parsedMinDate.isAfter(parsedMaxDate) || parsedMaxDate.isBefore(parsedMinDate)) {
      valid = false;
    }
    return valid;
  }
}
